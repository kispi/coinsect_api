import IContext from '../core/context'

const marketInfoController = {
  indices: (c: IContext) => {
    c.res.asJSON({
      usdKrw: 1150.5,
      dominance: {
        btc: 45.88,
        eth: 18.22,
      },
      totalMarketCap: 1321134065546,
      vol24: 60732991279,
    })
  },
}

export default marketInfoController