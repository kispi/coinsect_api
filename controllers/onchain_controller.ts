import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const onchainController = {
  richlist: {
    bitcoin: async (c: IContext) => {
      try {
        const data = await service.onchain.richlist.bitcoin()
        c.res.asJSON(data)
      } catch (e) {
        c.res.failed(e)
      }
    },
    bitcoinCash: async (c: IContext) => {
      try {
        const data = await service.onchain.richlist.bitcoinCash()
        c.res.asJSON(data)
      } catch (e) {
        c.res.failed(e)
      }
    },
    dogecoin: async (c: IContext) => {
      try {
        const data = await service.onchain.richlist.dogecoin()
        c.res.asJSON(data)
      } catch (e) {
        c.res.failed(e)
      }
    },
    litecoin: async (c: IContext) => {
      try {
        const data = await service.onchain.richlist.litecoin()
        c.res.asJSON(data)
      } catch (e) {
        c.res.failed(e)
      }
    },
  },
  whaleAlert: async (c: IContext) => {
    try {
      c.req.query['limit'] = 20
      c.res.asJSON(await service.onchain.whaleAlert.transactions(c))
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default onchainController