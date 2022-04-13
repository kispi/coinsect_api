import IContext from '../core/interfaces/context'
import useService from '../services'

const services = useService()

const s3Controller = {
  getSignedUrl: async (c: IContext) => {
    try {
      const url = await services.s3.getSignedUrl({
        key: c.req.query['key'] || '',
        tagging: c.req.query['tagging'] || '',
        nouuid: c.req.query['noUuid'],
      })
      c.res.success(url)
    } catch (e) {
      c.res.failed(e)
    }
  },
  deleteObjectTagging: (c: IContext) => services.s3.deleteObjectTagging(c.req.body['key']),
  deleteObject: (c: IContext) => services.s3.deleteObject(c.req.body['key']),
}

export default s3Controller