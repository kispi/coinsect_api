const AWS = require('aws-sdk')
import helpers from '../../core/helpers'
import store from '../../store'

AWS.config.update({
  region: 'ap-northeast-2',
  accessKeyId: store.state.serverConfig.AWS_ACCESS_KEY_ID,
  secretAccessKey: store.state.serverConfig.AWS_SECRET_ACCESS_KEY,
})

const Bucket = 'coinsect-production'

const host = 'https://coinsect-production.s3.ap-northeast-2.amazonaws.com/'

const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: 'ap-northeast-2'
})

const s3Service = {
  getKeyPart: (fullUrl: string) => fullUrl.split(host)[1],
  imageExt: (fileName: string) => {
    if (!fileName || !helpers.isImageUrl(fileName)) return ''

    const splitted = fileName.toLowerCase().split('.')
    return splitted[splitted.length - 1]
  },
  getSignedUrl: async ({ key, tagging, nouuid }) => {
    if (!key) return Promise.reject({ message: 'INVALID_PAYLOAD' })

    const fractions = (key || '').split('/')
    const fileName = fractions[fractions.length - 1]
    const ext = s3Service.imageExt(fileName)

    // ADMIN의 경우는 uuid를 생성하지 않고 그냥 어드민에서 입력한 키를 그대로 사용한다.
    const Key = nouuid ?
      key :
      key.split('/').filter(frag => frag).slice(0, -1).join('/') + '/' + helpers.crypto.generateUUID() + '_' + fileName

    try {
      const url = await s3.getSignedUrl('putObject', {
        Bucket: 'coinsect-production',
        Key,
        Expires: 60 * 1,
        ContentType: 'image/png;image/jpeg;image/jpg;image/gif;image/svg+xml',
        ACL: 'public-read',
        Tagging: tagging,
      })
      const resp = { url, headers: {} }
      if (ext) resp.headers['Content-Type'] = `image/${ext}`
      if (tagging) resp.headers['x-amz-tagging'] = tagging
      return resp
    } catch (e) {
      return Promise.reject(e)
    }
  },
  deleteObject: (Key: string) => s3.deleteObject({
    Bucket,
    Key,
  }).promise(),
  deleteObjectTagging: (Key: string) => s3.deleteObjectTagging({
    Bucket,
    Key,
  }).promise(),
}

export default s3Service