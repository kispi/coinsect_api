import mysql from 'mysql2/promise'
import pkg from 'pg'
import { TABLES, describeTable } from './schema.mjs'

const { Client } = pkg
const BATCH = 1000

const arg = name => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

// MySQL을 dateStrings로 읽으므로 시각은 'YYYY-MM-DD HH:mm:ss.SSSSSS' 문자열로 온다.
// 여기에 Z를 붙여 UTC임을 못 박는다. 드라이버의 타임존 해석에 절대 의존하지 않는다.
const toUtc = v => (v === null || v === undefined ? null : `${String(v).replace(' ', 'T')}Z`)

// MySQL의 tinyint(0/1)를 PostgreSQL boolean으로 옮긴다.
const toBool = v => (v === null || v === undefined ? null : Number(v) === 1)

const buildRow = (row, meta) => meta.columns.map(col => {
  const value = row[col]
  if (meta.timestampColumns.includes(col)) return toUtc(value)
  if (meta.booleanColumns.includes(col)) return toBool(value)
  return value === undefined ? null : value
})

const insertSql = (meta, mode) => {
  const cols = meta.columns.map(c => `"${c}"`).join(', ')
  const placeholders = (rowIdx) =>
    `(${meta.columns.map((_, i) => `$${rowIdx * meta.columns.length + i + 1}`).join(', ')})`

  return rowCount => {
    const values = Array.from({ length: rowCount }, (_, i) => placeholders(i)).join(', ')
    let sql = `INSERT INTO "${meta.table}" (${cols}) VALUES ${values}`

    if (!meta.conflictKey) return sql

    const conflictCols = meta.conflictKey.map(c => `"${c}"`).join(', ')

    if (mode === 'delta' && meta.hasUpdatedAt) {
      // 델타는 INSERT와 UPDATE(소프트삭제 포함)를 한 번에 처리한다.
      const updates = meta.columns
        .filter(c => !meta.conflictKey.includes(c))
        .map(c => `"${c}" = EXCLUDED."${c}"`)
        .join(', ')
      sql += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`
    } else {
      sql += ` ON CONFLICT (${conflictCols}) DO NOTHING`
    }
    return sql
  }
}

const copyTable = async (my, pg, table, { mode, since }) => {
  const meta = await describeTable(pg, table)
  const sqlFor = insertSql(meta, mode)

  // updated_at이 없는 테이블(whale_alerts, persons_images)은 델타에서도 전체를 훑는다.
  // 각각 8만 행과 18행이라 부담이 없다.
  const useSince = mode === 'delta' && meta.hasUpdatedAt
  const cols = meta.columns.map(c => `\`${c}\``).join(', ')
  const orderBy = (meta.conflictKey ?? [meta.columns[0]]).map(c => `\`${c}\``).join(', ')

  // keyset(seek) 페이지네이션: 단일 컬럼 PK를 가진 테이블은 OFFSET 대신
  // `WHERE pk > :lastSeen ORDER BY pk LIMIT n`으로 다음 배치를 가져온다.
  // messages_202605처럼 85만 행짜리 테이블에서 OFFSET은 매 배치마다 이미 지나간
  // 행을 처음부터 다시 스캔해 버려야 해서(평균 오프셋 42만) 배치 수에 비례해
  // 점점 느려진다. keyset은 인덱스로 바로 다음 지점을 찾으므로 배치당 비용이
  // 일정하다. whale_alerts의 PK인 hash는 varchar이지만 비교식(`>`)과 정렬 모두
  // 드라이버가 넘겨준 원래 타입(문자열)을 그대로 쓰므로 숫자 키를 가정하지 않는다.
  // persons_images는 (persons_id, images_id) 복합키라 다중 컬럼 keyset 비교식이
  // 필요한데, 18행뿐이라 OFFSET 성능 문제가 애초에 없다 - 코드를 단순하게 유지하기
  // 위해 이 테이블만 기존 OFFSET 방식을 그대로 쓴다.
  const useKeyset = Boolean(meta.conflictKey) && meta.conflictKey.length === 1
  const keysetCol = useKeyset ? meta.conflictKey[0] : null

  // updated_at 트리거(set_updated_at, schema/001_baseline.sql)는 ON CONFLICT DO
  // UPDATE에도 BEFORE UPDATE로 걸려서, 우리가 EXCLUDED로 넘긴 MySQL 원본
  // updated_at을 now()로 덮어써 버린다. 델타 upsert가 도는 동안만 사용자 트리거를
  // 꺼서 원본 시각을 보존한다. DISABLE TRIGGER USER는 사용자 트리거만 끄고 FK
  // 제약(내부 트리거)은 그대로 강제하므로 무결성에는 영향이 없다.
  const suppressTrigger = mode === 'delta' && meta.hasUpdatedAt && Boolean(meta.conflictKey)

  // DISABLE → 배치 복사 → ENABLE을 하나의 명시적 트랜잭션으로 묶는다. ALTER TABLE
  // DISABLE TRIGGER는 그 자체로는 즉시 커밋되는 DDL이라, BEGIN 없이 실행하면
  // ENABLE 전에 프로세스가 죽었을 때(OOM 등, 서버 여유 메모리가 1GB 안팎이라
  // 충분히 가능하다) 트리거가 영구히 비활성 상태로 남는다. BEGIN으로 묶어 두면
  // 커넥션이 죽었을 때 PostgreSQL이 미완료 트랜잭션을 자동 롤백하므로 DISABLE도
  // 함께 취소된다. 명시적 에러 시에도 ROLLBACK 후 예외를 다시 던져 실행을 멈춘다.
  if (suppressTrigger) {
    await pg.query('BEGIN')
    await pg.query(`ALTER TABLE "${table}" DISABLE TRIGGER USER`)
  }

  let copied = 0
  let offset = 0       // OFFSET 방식(복합키 테이블)에서만 쓴다
  let lastSeen = null  // keyset 방식(단일 컬럼 PK)에서만 쓴다

  try {
    for (;;) {
      const conditions = []
      const params = []
      if (useSince) { conditions.push('updated_at >= ?'); params.push(since) }

      let sql
      if (useKeyset) {
        if (lastSeen !== null) {
          conditions.push(`\`${keysetCol}\` > ?`)
          params.push(lastSeen)
        }
        const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
        sql = `SELECT ${cols} FROM \`${table}\`${whereClause} ORDER BY \`${keysetCol}\` LIMIT ?`
        params.push(BATCH)
      } else {
        const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
        sql = `SELECT ${cols} FROM \`${table}\`${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
        params.push(BATCH, offset)
      }

      const [rows] = await my.query(sql, params)
      if (rows.length === 0) break

      const flat = rows.flatMap(row => buildRow(row, meta))
      await pg.query(sqlFor(rows.length), flat)

      copied += rows.length
      if (useKeyset) lastSeen = rows[rows.length - 1][keysetCol]
      else offset += rows.length
      process.stdout.write(`\r  ${table}: ${copied}`)
    }

    if (suppressTrigger) {
      await pg.query(`ALTER TABLE "${table}" ENABLE TRIGGER USER`)
      await pg.query('COMMIT')
    }
  } catch (e) {
    if (suppressTrigger) {
      // 커넥션이 이미 끊긴 상태라면 ROLLBACK 자체가 실패할 수 있지만, 그 경우
      // PostgreSQL이 연결 종료 시 미완료 트랜잭션을 알아서 롤백해 준다.
      await pg.query('ROLLBACK').catch(() => {})
    }
    throw e
  }

  process.stdout.write(`\r  ${table}: ${copied}\n`)
  return copied
}

// identity 컬럼의 시퀀스를 MAX(id)에 맞춘다. 빠뜨리면 앱 기동 직후 첫 INSERT부터
// PK 충돌이 난다.
const resetSequences = async (pg) => {
  for (const table of TABLES) {
    const meta = await describeTable(pg, table)
    if (!meta.hasIdentity) continue

    await pg.query(
      `SELECT setval(
         pg_get_serial_sequence($1, 'id'),
         COALESCE((SELECT MAX(id) FROM "${table}"), 1),
         (SELECT MAX(id) IS NOT NULL FROM "${table}")
       )`,
      [table],
    )
    console.log(`  ${table}: 시퀀스 재설정`)
  }
}

const main = async () => {
  const mode = arg('mode') || 'full'
  const since = arg('since')

  if (!['full', 'delta'].includes(mode)) throw new Error('--mode는 full 또는 delta')
  if (mode === 'delta' && !since) throw new Error('--mode=delta에는 --since=<ISO8601>이 필요하다')
  if (!process.env.MYSQL_URL || !process.env.PG_URL) throw new Error('MYSQL_URL, PG_URL 환경변수가 필요하다')

  const my = await mysql.createConnection({
    uri: process.env.MYSQL_URL,
    // 드라이버가 시각을 해석하지 못하게 막는다. 문자열 그대로 받아 직접 UTC로 표시한다.
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  })
  const pg = new Client({ connectionString: process.env.PG_URL })
  await pg.connect()
  await pg.query("SET timezone = 'UTC'")

  console.log(`모드: ${mode}${since ? ` (since ${since})` : ''}`)
  try {
    for (const table of TABLES) await copyTable(my, pg, table, { mode, since })
    console.log('시퀀스 재설정:')
    await resetSequences(pg)
    console.log('완료')
  } finally {
    await pg.end()
    await my.end()
  }
}

main().catch(e => {
  console.error('\n실패:', e.message)
  process.exit(1)
})
