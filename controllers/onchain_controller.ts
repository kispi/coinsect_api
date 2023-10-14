import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const onchainController = {
  whaleAlert: async (c: IContext) => {
    try {
      c.res.asJSON(helpers.crypto.encryptAPIResponse(await service.onchain.whaleAlert.transactions(c)))
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default onchainController