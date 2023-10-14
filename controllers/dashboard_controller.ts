import { dataSource } from '../database'
import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import useCache from '../core/cache'
import dashboardService from '../services/dashboard'

const cache = useCache()

const activityQuery = ({ tablename, start, end }: { tablename: string, start?: string, end?: string }) => {
  if (start && !helpers.dayjs(start).isValid()) return Promise.reject({ message: 'INVALID_DATE' })
  if (end && !helpers.dayjs(end).isValid()) return Promise.reject({ message: 'INVALID_DATE' })

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

  if (start) base += ` AND ${tablename}.created_at >= '${start}'`
  if (end) base += ` AND ${tablename}.created_at < '${end}'`

  return base + `
    GROUP BY ${tablename}.user_id
    ORDER BY COUNT(*) DESC;
  `
}

const dashboardController = {
  activities: async (c: IContext) => {
    const keys = ['messages', 'posts', 'replies']
    try {
      const data = await Promise.all(keys.map(async tablename => dataSource.query(await activityQuery({
        tablename,
        start: c.req.query['start'],
        end: c.req.query['end'],
      }))))
      const aggregated = keys.map((key, idx) => ({ key, data: data[idx] }))
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