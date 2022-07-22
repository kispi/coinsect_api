import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const helperController = {
  crawlMetaTags: async (c: IContext) => {
    try {
      c.res.success(await service.helper.crawlMetaTags(c.req.query['url']))
    } catch (e) {
      c.res.failed({ message: 'failed to crawl given url' })
    }
  },
}

export default helperController