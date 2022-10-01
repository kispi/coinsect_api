import IContext from '../core/interfaces/context'
import useService from '../services'

const services = useService()

const awsController = {
  rekognition: {
    isGraphic: async (c: IContext) => {
      const url = c.req.query['url']
      try {
        c.res.success(await services.aws.rekognition.isGraphic(url))
      } catch (e) {
        c.res.failed(e)
      }
    },
    imageModeration: async (c: IContext) => {
      const url = c.req.query['url']
      try {
        const result = await services.aws.rekognition.imageModeration(url)
        c.res.success(result)
      } catch (e) {
        c.res.failed(e)
      }
    },
  },
  s3: {
    getSignedUrl: async (c: IContext) => {
      try {
        const url = await services.aws.s3.getSignedUrl({
          key: c.req.query['key'] || '',
          tagging: c.req.query['tagging'] || '',
          nouuid: c.req.query['noUuid'],
        })
        c.res.success(url)
      } catch (e) {
        c.res.failed(e)
      }
    },
    deleteObjectTagging: (c: IContext) => services.aws.s3.deleteObjectTagging(c.req.body['key']),
    deleteObject: (c: IContext) => services.aws.s3.deleteObject(c.req.body['key']),
  },
}

export default awsController