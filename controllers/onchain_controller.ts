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
  },
}

export default onchainController