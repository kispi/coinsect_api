const AWS = require('aws-sdk')
import { ModerationLabel } from 'aws-sdk/clients/rekognition'
import useCache from '../../core/cache'
import helpers from '../../core/helpers'
import store from '../../store'

const cache = useCache()

let rekognitionTestedUrls = {}

let rekognitionTestingUrls = {}

const removeTestedUrls = (url: string) => {
  delete rekognitionTestedUrls[url]
  delete rekognitionTestingUrls[url]
}

const rekognition = new AWS.Rekognition({
  region: 'ap-northeast-2',
  accessKeyId: store.state.serverConfig.AWS_ACCESS_KEY_ID,
  secretAccessKey: store.state.serverConfig.AWS_SECRET_ACCESS_KEY,
})

const rekognitionService = {
  all: async () => {
    rekognitionTestedUrls = await cache.get('rekognition_tested_urls')
    return rekognitionTestedUrls
  },
  delete: async (url: string) => {
    removeTestedUrls(url)
    cache.set('rekognition_tested_urls', rekognitionTestedUrls)
    return rekognitionService.all()
  },
  imageModeration: async (url: string) => {
    if (!url) return Promise.reject({ message: 'invalid url' })

    const found = rekognitionTestedUrls[url]
    if (found) return found

    if (rekognitionTestingUrls[url]) return Promise.reject({ message: 'AWS Rekognition still in process... try it again after a while.'})

    rekognitionTestingUrls[url] = true
    try {
      const base64 = await helpers.imageUrlToBlob(url)
      return new Promise((resolve, reject) => {
        rekognition.detectModerationLabels({
          Image: {
            Bytes: base64,
          },
        }, (err, data) => {
          delete rekognitionTestingUrls[url]
          if (err) reject(err)

          rekognitionTestedUrls[url] = data
          cache.set('rekognition_tested_urls', rekognitionTestedUrls)
          resolve(data)
        })
      })
    } catch (e) {
      return Promise.reject(e)
    } finally {
      removeTestedUrls(url)
    }
  },
  isGraphic: async (url: string) => {
    try {
      const { ModerationLabels } = await rekognitionService.imageModeration(url) as { ModerationLabels: Array<ModerationLabel> }
      return ModerationLabels.some(label => {
        if (label.Confidence < 50) return

        return ['Nudity', 'Sexual'].some(word => (label.Name || label.ParentName || '').includes(word))
      })
    } catch (e) {
      return Promise.reject(e)
    }
  },
  isTextIncludingGraphicImageUrl: async (text: string) => {
    const url = helpers.retrieveUrlFromString(text)
    if (!url || !['.jpg', '.jpeg', '.png'].some(ext => url.endsWith(ext))) return

    return await rekognitionService.isGraphic(url)
  },
}

export default rekognitionService