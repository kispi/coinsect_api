const AWS = require('aws-sdk')
import IContext from '../core/context'
import helpers from '../core/helpers'
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
    const reqKey = c.req.query['key'] || ''
    if (!reqKey) return Promise.reject({ message: 'INVALID_PAYLOAD' })

    // ADMIN의 경우는 uuid를 생성하지 않고 그냥 어드민에서 입력한 키를 그대로 사용한다.
    const Key = c.req.query['noUuid'] ?
      c.req.query['key'] :
      reqKey.split('/').filter(frag => frag).slice(0, -1).join('/') + '/' + helpers.generateUUID()

    try {
      const url = await s3.getSignedUrl('putObject', {
        Bucket: 'coinsect-production',
        Key,
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