import IContext from '../core/interfaces/context'
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
  realTimePositions: {
    all: async (c: IContext) => c.res.asJSON(await service.content.realTimePositions.all()),
    set: (c: IContext) => {
      service.content.realTimePositions.set(c.req.body)
      c.res.success()
    },
    delete: (c: IContext) => {
      service.content.realTimePositions.delete(c.req.params['id'])
      c.res.success()
    },
  },
}

export default contentController