import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const helperController = {
  crawledWebsites: {
    one: async (c: IContext) => {
      try {
        c.res.success(await service.helper.crawledWebsites.one(c.req.params['url']))
      } catch (e) {
        c.res.failed({ message: 'failed to crawl given url' })
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