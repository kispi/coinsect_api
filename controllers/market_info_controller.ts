import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const rejectableWrapper = async (c: IContext, promise: () => Promise<any>) => {
  try {
    const result = await promise()
    c.res.asJSON(result)
  } catch (e) {
    c.res.failed(e)
  }
}

const marketInfoController = {
  indices: async (c: IContext) => rejectableWrapper(c, service.marketInfo.indices),
  symbols: async (c: IContext) => rejectableWrapper(c, service.marketInfo.symbols),
  markets: async (c: IContext) => rejectableWrapper(c, service.marketInfo.markets),
  leaderboard: async (c: IContext) => rejectableWrapper(c, service.marketInfo.leaderboard),
  crypto: async (c: IContext) => rejectableWrapper(c, () => service.marketInfo.crypto(c.req.query)),
  assetsIncludingMetal: async (c: IContext) => rejectableWrapper(c, service.marketInfo.assetsIncludingMetal),
  nasdaq: async (c: IContext) => rejectableWrapper(c, service.marketInfo.nasdaq.markets),
  kospi: async (c: IContext) => rejectableWrapper(c, () => service.marketInfo.kospi.markets(c.req.query['page'])),
}

export default marketInfoController