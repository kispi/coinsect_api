const AWS = require('aws-sdk')
import IContext from '../core/context'

const s3Controller = {
  uploadUrl: async (c: IContext) => {
    const s3 = new AWS.S3({
      signatureVersion: 'v4',
      region: 'ap-northeast-2'
    })

    try {
      const url = await s3.getSignedUrl('putObject', {
        Bucket: 'coinsect-production',
        Key: c.req.query['fileName'],
        Expires: 60 * 1,
        ContentType: 'image/png;image/jpeg;image/jpg;image/gif;image/svg+xml',
        ACL: 'public-read',
      })
      return url
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

export default s3Controller