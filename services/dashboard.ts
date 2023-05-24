import { dataSource } from '../database'
import useCache from '../core/cache'
import IContext from '../core/interfaces/context'
import contentService from './content'
import marketInfoService from './market_info'
import whaleAlertService from './onchain/whale_alert'

const cache = useCache()

const dashboardService = {
  // 고래알림, 자유게시판, 리더보드, 실시간 포지션
  main: async (forceUpdate?: boolean) => {
    const storedResp = await cache.get('dashboards:main')
    if (storedResp && !forceUpdate) return storedResp

    const c = { orm: dataSource, req: {} } as IContext
    try {
      const o = await Promise.all([
        whaleAlertService.transactions(c, { limit: 20, where: 'amount_usd >= 3000000 AND (from_owner_type != "unknown" XOR to_owner_type != "unknown")' }),
        contentService.realTimePosition.all(),
        marketInfoService.leaderboard(),
      ])
      const resp = {
        whaleAlerts: o[0],
        realTimePositions: { data: o[1].data.filter(o => o.editable), lastUpdate: o[1].lastUpdate },
        leaderboards: o[2],
      }
      cache.set('dashboards:main', resp, 60)
      return resp
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

export default dashboardService