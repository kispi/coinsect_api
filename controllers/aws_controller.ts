import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const awsController = {
  rekognition: {
    detectText: {
      create: async (c: IContext) => {
        const url = c.req.query['url']//c.req.body['url']
        try {
          const result = await service.aws.rekognition.detectText.create(url)
          c.res.success(result)
        } catch (e) {
          c.res.failed(e)
        }
      },
    },
    imageModeration: {
      create: async (c: IContext) => {
        const url = c.req.body['url']
        try {
          const result = await service.aws.rekognition.imageModeration.create(url)
          c.res.success(result)
        } catch (e) {
          c.res.failed(e)
        }
      },
      all: async (c: IContext) => {
        try {
          const data = await service.aws.rekognition.imageModeration.all()
          c.res.asJSON({
            total: Object.keys(data || {}).length,
            data,
          })
        } catch (e) {
          c.res.failed(e)
        }
      },
      delete: async (c: IContext) => {
        try {
          const data = await service.aws.rekognition.imageModeration.delete(c.req.body['url'])
          c.res.asJSON({
            total: Object.keys(data || {}).length,
            data,
          })
        } catch (e) {
          c.res.failed(e)
        }
      },
      deleteBulk: async (c: IContext) => {
        try {
          const data = await service.aws.rekognition.imageModeration.deleteBulk(c.req.body['deleteAll'])
          c.res.asJSON({
            total: Object.keys(data || {}).length,
            data,
          })
        } catch (e) {
          c.res.failed(e)
        }
      },
    },
  },
  s3: {
    getSignedUrl: async (c: IContext) => {
      try {
        const url = await service.aws.s3.getSignedUrl({
          key: c.req.query['key'] || '',
          tagging: c.req.query['tagging'] || '',
          nouuid: c.req.query['noUuid'],
        })
        c.res.success(url)
      } catch (e) {
        c.res.failed(e)
      }
    },
    deleteObjectTagging: (c: IContext) => service.aws.s3.deleteObjectTagging(c.req.body['key']),
    deleteObject: (c: IContext) => service.aws.s3.deleteObject(c.req.body['key']),
  },
}

export default awsController