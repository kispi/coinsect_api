import { dataSource } from '../database'
import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import whaleAlertService from '../services/onchain/whale_alert'
import postService from '../services/post'
import contentService from '../services/content'
import marketInfoService from '../services/market_info'
import useCache from '../core/cache'

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
    // 고래알림, 자유게시판, 리더보드, 실시간 포지션
    const storedResp = await cache.get('dashboards:main')
    if (storedResp) return c.res.asJSON(storedResp)

    try {
      const o = await Promise.all([
        whaleAlertService.transactions(c, { limit: 10, where: 'amount_usd >= 4000000 AND (from_owner_type != "unknown" XOR to_owner_type != "unknown")' }),
        postService.all(c, { limit: 10, sort: 'created_at', order: 'DESC', where: 'board_id != 3' }),
        contentService.realTimePosition.all(),
        marketInfoService.leaderboard(),
      ])
      const resp = {
        whaleAlerts: o[0],
        posts: o[1],
        realTimePositions: o[2],
        leaderboards: o[3],
      }
      cache.set('dashboards:main', resp, 60)
      c.res.asJSON(resp)
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default dashboardController