import mysql from 'mysql2/promise'
import pkg from 'pg'
import { TABLES, describeTable } from './schema.mjs'

const { Client } = pkg

const main = async () => {
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

  await pg.end()
  await my.end()

  console.log(failed === 0 ? '\n전부 일치' : `\n불일치 ${failed}건`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(e => {
  console.error('실패:', e.message)
  process.exit(1)
})
