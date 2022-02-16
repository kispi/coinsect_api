import IContext from '../core/context'
import useService from '../services'

const service = useService()

const contentController = {
  publicTreasuries: async (c: IContext) => {
    try {
      c.res.asJSON(await service.content.publicTreasuries())
    } catch (e) {
      c.res.failed()
    }
  },
}

export default contentController