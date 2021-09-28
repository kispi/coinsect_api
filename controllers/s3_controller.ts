const AWS = require('aws-sdk')
import IContext from '../core/context'
import store from '../store'

AWS.config.update({
  region: 'ap-northeast-2',
  accessKeyId: store.state.serverConfig.AWS_ACCESS_KEY_ID,
  secretAccessKey: store.state.serverConfig.AWS_SECRET_ACCESS_KEY,
})

const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: 'ap-northeast-2'
})

const s3Controller = {
  uploadUrl: async (c: IContext) => {
    try {
      const url = await s3.getSignedUrl('putObject', {
        Bucket: 'coinsect-production',
        Key: c.req.query['key'],
        Expires: 60 * 1,
        ContentType: 'image/png;image/jpeg;image/jpg;image/gif;image/svg+xml',
        ACL: 'public-read',
      })
      return url
    } catch (e) {
      return Promise.reject(e)
    }
  },
  deleteObject: (c: IContext) => {
    s3.deleteObject({
      Bucket: 'coinsect-production',
      Key: c.req.body['s3Key'],
    }).promise()
  },
}

export default s3Controller