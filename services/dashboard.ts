import { dataSource } from '../database'
import useCache from '../core/cache'
import IContext from '../core/interfaces/context'
import contentService from './content'
import marketInfoService from './market_info'
import whaleAlertService from './onchain/whale_alert'

const cache = useCache()

const dashboardService = {
  // 고래알림, 리더보드, 실시간 포지션
  main: async (forceUpdate?: boolean) => {
    const storedResp = await cache.get('dashboards:main')
    if (storedResp && !forceUpdate) return storedResp

    const c = { orm: dataSource, req: {} } as IContext
    try {
      const o = await Promise.allSettled([
        whaleAlertService.transactions(c, { limit: 5, where: 'amount_usd >= 3000000 AND (from_owner_type != "unknown" XOR to_owner_type != "unknown")' }),
        contentService.realTimePosition.all(),
        marketInfoService.leaderboard(),
        contentService.news.upbit(),
      ])
      const resp = {
        whaleAlerts: o[0].status === 'fulfilled' ? o[0].value : { data: [] },
        realTimePositions: o[1].status === 'fulfilled' ? { data: o[1].value.data.filter(o => o.editable), lastUpdate: o[1].value.lastUpdate } : { data: [], lastUpdate: null },
        leaderboards: o[2].status === 'fulfilled' ? o[2].value : [],
        news: o[3].status === 'fulfilled' ? o[3].value.data.featured_list : [],
      }
      cache.set('dashboards:main', resp, 60)
      return resp
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

export default dashboardService