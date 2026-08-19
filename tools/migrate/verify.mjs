import mysql from 'mysql2/promise'
import pkg from 'pg'
import { TABLES, describeTable } from './schema.mjs'

const { Client } = pkg

const main = async () => {
  if (!process.env.MYSQL_URL || !process.env.PG_URL) throw new Error('MYSQL_URL, PG_URL 환경변수가 필요하다')

  const my = await mysql.createConnection({ uri: process.env.MYSQL_URL, dateStrings: true })
  const pg = new Client({ connectionString: process.env.PG_URL })
  await pg.connect()
  await pg.query("SET timezone = 'UTC'")

  let failed = 0

  for (const table of TABLES) {
    const meta = await describeTable(pg, table)
    // 경계값 비교는 updated_at이 있는 테이블에만 쓴다 - 그런 테이블은 항상 id
    // 단일 PK이므로 conflictKey의 첫 컬럼을 그대로 쓸 수 있다.
    const key = meta.conflictKey?.[0]

    // 행 수
    const [[myCount]] = await my.query(`SELECT COUNT(*) AS n FROM \`${table}\``)
    const { rows: [pgCount] } = await pg.query(`SELECT COUNT(*) AS n FROM "${table}"`)
    const same = String(myCount.n) === String(pgCount.n)
    if (!same) failed++
    console.log(`${same ? 'OK  ' : 'FAIL'} ${table}: mysql=${myCount.n} pg=${pgCount.n}`)

    // 경계값. 타임존이 밀렸는지 여기서 드러난다.
    if (meta.hasUpdatedAt) {
      const [[myB]] = await my.query(
        `SELECT MIN(${key}) AS lo, MAX(${key}) AS hi, MAX(updated_at) AS mx FROM \`${table}\``)
      const { rows: [pgB] } = await pg.query(
        `SELECT MIN(${key}) AS lo, MAX(${key}) AS hi,
                to_char(MAX(updated_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS mx
           FROM "${table}"`)
      const myMax = myB.mx ? String(myB.mx).slice(0, 19).replace('T', ' ') : null
      const ok = String(myB.lo) === String(pgB.lo)
        && String(myB.hi) === String(pgB.hi)
        && myMax === pgB.mx
      if (!ok) failed++
      console.log(`${ok ? 'OK  ' : 'FAIL'}   경계: mysql=${myB.lo}..${myB.hi}/${myMax} pg=${pgB.lo}..${pgB.hi}/${pgB.mx}`)
    }
  }

  // boolean 변환
  const [[myActive]] = await my.query('SELECT COUNT(*) AS n FROM notifications WHERE active = 1')
  const { rows: [pgActive] } = await pg.query('SELECT COUNT(*) AS n FROM notifications WHERE active = true')
  const activeOk = String(myActive.n) === String(pgActive.n)
  if (!activeOk) failed++
  console.log(`${activeOk ? 'OK  ' : 'FAIL'} notifications.active: mysql=${myActive.n} pg=${pgActive.n}`)

  // numeric 정밀도
  const [[myAmt]] = await my.query('SELECT SUM(amount_usd) AS s FROM whale_alerts')
  const { rows: [pgAmt] } = await pg.query('SELECT SUM(amount_usd) AS s FROM whale_alerts')
  const amtOk = String(myAmt.s) === String(pgAmt.s)
  if (!amtOk) failed++
  console.log(`${amtOk ? 'OK  ' : 'FAIL'} whale_alerts.amount_usd 합계: mysql=${myAmt.s} pg=${pgAmt.s}`)

  // 비활성 트리거. copy.mjs가 델타 upsert 동안 사용자 트리거를 끄는데, 프로세스가
  // DISABLE과 ENABLE 사이에서 죽으면(OOM 등) 트리거가 영구히 비활성 상태로 남을 수
  // 있다 - 조용히 실패하는 종류의 문제라 여기서 반드시 잡아야 몇 달 뒤에야
  // 발견되는 사고를 막는다.
  const { rows: disabledTriggers } = await pg.query(`
    SELECT c.relname, t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
     WHERE NOT t.tgisinternal AND t.tgenabled = 'D'
  `)
  const triggersOk = disabledTriggers.length === 0
  if (!triggersOk) failed++
  console.log(`${triggersOk ? 'OK  ' : 'FAIL'} 비활성 트리거: ${triggersOk ? '없음' : ''}`)
  for (const row of disabledTriggers) {
    console.log(`  비활성 트리거 발견: ${row.relname}.${row.tgname}`)
  }

  await pg.end()
  await my.end()

  console.log(failed === 0 ? '\n전부 일치' : `\n불일치 ${failed}건`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(e => {
  console.error('실패:', e.message)
  process.exit(1)
})
