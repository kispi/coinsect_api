import IContext from '../core/context'
import useService from '../services'

const services = useService()

const s3Controller = {
  getSignedUrl: (c: IContext) => services.s3.getSignedUrl({
    key: c.req.query['key'] || '',
    tagging: c.req.query['tagging'] || '',
    nouuid: c.req.query['noUuid'],
  }),
  deleteObjectTagging: (c: IContext) => services.s3.deleteObjectTagging(c.req.body['key']),
  deleteObject: (c: IContext) => services.s3.deleteObject(c.req.body['key']),
}

export default s3Controller