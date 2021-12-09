import IContext from '../core/context'
import useService from '../services'

const service = useService()

const marketInfoController = {
  indices: async (c: IContext) => c.res.asJSON(await service.marketInfo.indices()),
  symbols: async (c: IContext) => c.res.asJSON(await service.marketInfo.symbols()),
  markets: async (c: IContext) => c.res.asJSON(await service.marketInfo.markets()),
  leaderboard: async (c: IContext) => c.res.asJSON(await service.marketInfo.leaderboard()),
}

export default marketInfoController