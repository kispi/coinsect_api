import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const helperController = {
  crawledWebsites: {
    one: async (c: IContext) => {
      try {
        c.res.asJSON(await service.helper.crawledWebsites.one(c.req.params['url']))
      } catch (e) {
        const error = { message: 'failed to crawl url' }
        if (e.status) error['httpStatus'] = e.status
        c.res.failed(error)
      }
    },
    all: async (c: IContext) => {
      try {
        const data = await service.helper.crawledWebsites.all()
        c.res.asJSON({
          total: data.length,
          data,
        })
      } catch (e) {
        c.res.error()
      }
    },
    examples: (c: IContext) => c.res.asJSON(service.helper.crawledWebsites.examples()),
  },
}

export default helperController