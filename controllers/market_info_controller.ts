import IContext from '../core/context'
import useService from '../services'

const service = useService()

const marketInfoController = {
  indices: async (c: IContext) => c.res.asJSON(await service.marketInfo.indices()),
  caps: async (c: IContext) => {
    const source = c.req.query['source']
    if (!['upbit', 'coinmarketcap'].includes(source)) {
      return c.res.failed(`invalid query param: 'source' ['upbit' || 'coinmarketcap']`)
    }

    c.res.asJSON(await service.marketInfo.marketcaps(source))
  },
  markets: async (c: IContext) => c.res.asJSON(await service.marketInfo.markets()),
  leaderboard: async (c: IContext) => c.res.asJSON(await service.marketInfo.leaderboard()),
}

export default marketInfoController