import { dataSource } from '../database'
import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import useCache from '../core/cache'
import dashboardService from '../services/dashboard'

const cache = useCache()

const ACTIVITY_TABLES = ['messages', 'posts', 'replies'] as const
type ActivityTable = typeof ACTIVITY_TABLES[number]

const activityQuery = ({ tablename, start, end }: { tablename: string, start?: string, end?: string }) => {
  // 테이블명은 자리표시자로 넘길 수 없으므로 화이트리스트로 막는다.
  if (!ACTIVITY_TABLES.includes(tablename as ActivityTable)) {
    return Promise.reject({ message: 'INVALID_TABLE', status: 400 })
  }
  if (start && !helpers.dayjs(start).isValid()) return Promise.reject({ message: 'INVALID_DATE', status: 400 })
  if (end && !helpers.dayjs(end).isValid()) return Promise.reject({ message: 'INVALID_DATE', status: 400 })

  const params: string[] = []
  let base = `
    SELECT
      COUNT(*) AS count,
      MAX(p.nickname) AS nickname,
      MAX(p.image) AS image,
      MIN(${tablename}.created_at) AS first_seen,
      MAX(${tablename}.created_at) AS last_seen
    FROM ${tablename}
    LEFT JOIN users as u ON u.id = ${tablename}.user_id
    LEFT JOIN profiles as p ON p.user_id = u.id
    WHERE ${tablename}.user_id IS NOT NULL
  `

  // pg 드라이버는 $1, $2 같은 위치 기반 자리표시자를 쓴다. ?를 그대로 두면 드라이버가
  // 이해하지 못한다.
  if (start) {
    params.push(start)
    base += ` AND ${tablename}.created_at >= $${params.length}`
  }
  if (end) {
    params.push(end)
    base += ` AND ${tablename}.created_at < $${params.length}`
  }

  return {
    sql: base + `
      GROUP BY ${tablename}.user_id
      ORDER BY COUNT(*) DESC
    `,
    params,
  }
}

const dashboardController = {
  activities: async (c: IContext) => {
    try {
      const data = await Promise.all(ACTIVITY_TABLES.map(async tablename => {
        const { sql, params } = await activityQuery({
          tablename,
          start: c.req.query['start'],
          end: c.req.query['end'],
        })
        return dataSource.query(sql, params)
      }))
      const aggregated = ACTIVITY_TABLES.map((key, idx) => ({ key, data: data[idx] }))
      c.res.success(aggregated)
    } catch (e) {
      c.res.failed(e)
    }
  },
  main: async (c: IContext) => {
    try {
      const resp = helpers.crypto.encryptAPIResponse(await dashboardService.main())
      c.res.asJSON(resp)
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default dashboardController