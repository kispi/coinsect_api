import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const helperController = {
  crawledWebsites: {
    create: async (c: IContext) => {
      try {
        c.res.asJSON(await service.helper.crawledWebsites.crawl(c.req.body['url']))
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
          total: Object.keys(data || {}).length,
          data,
        })
      } catch (e) {
        c.res.error()
      }
    },
    delete: async (c: IContext) => {
      try {
        const data = await service.helper.crawledWebsites.delete(c.req.body['url'])
        c.res.asJSON({
          total: Object.keys(data || {}).length,
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