import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const helperController = {
  crawlMetaTags: async (c: IContext) => c.res.asJSON(await service.helper.crawlMetaTags(c.req.query['url'])),
}

export default helperController