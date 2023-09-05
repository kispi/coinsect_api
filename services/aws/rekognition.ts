const AWS = require('aws-sdk')
import { ModerationLabel } from 'aws-sdk/clients/rekognition'
import { log } from '../../core/logger'
import useCache from '../../core/cache'
import helpers from '../../core/helpers'
import store from '../../store'
import realTimePosition from './real_time_position'

const cache = useCache()

let moderationTestedUrls = {}
let moderationTestingUrls = {}

let textDetectedUrls = {}
let textDetectingUrls = {}

const rekognition = new AWS.Rekognition({
  region: 'ap-northeast-2',
  accessKeyId: store.state.serverConfig.AWS_ACCESS_KEY_ID,
  secretAccessKey: store.state.serverConfig.AWS_SECRET_ACCESS_KEY,
})

const rekognitionService = {
  realTimePosition,
  imageModeration: {
    all: async () => {
      moderationTestedUrls = await cache.get('moderation_tested_urls')
      return moderationTestedUrls
    },
    delete: async (url: string) => {
      delete moderationTestedUrls[url]
      cache.set('moderation_tested_urls', moderationTestedUrls)
      return rekognitionService.imageModeration.all()
    },
    deleteBulk: async (deleteAll: Boolean) => {
      if (deleteAll) {
        moderationTestedUrls = {}
      } else {
        Object.keys(moderationTestedUrls).forEach(url => {
          const o = moderationTestedUrls[url]
          if (!o || (o.ModerationLabels || []).length === 0) delete moderationTestedUrls[url]
        })
      }
  
      cache.set('moderation_tested_urls', moderationTestedUrls)
      return rekognitionService.imageModeration.all()
    },
    create: async (url: string) => {
      if (!url) return Promise.reject({ message: 'invalid url' })
  
      moderationTestedUrls = await cache.get('moderation_tested_urls') || {}
      const found = moderationTestedUrls[url]
      if (found) return {
        cached: true,
        ...found,
      }
  
      if (moderationTestingUrls[url]) return Promise.reject({ message: 'AWS Rekognition still in process... try it again after a while.'})
  
      moderationTestingUrls[url] = true
      try {
        const base64 = await helpers.imageUrlToBlob(url)
        return new Promise((resolve, reject) => {
          rekognition.detectModerationLabels({
            Image: {
              Bytes: base64,
            },
          }, (err, data) => {
            delete moderationTestingUrls[url]
            if (err) reject(err)
  
            moderationTestedUrls[url] = data
            cache.set('moderation_tested_urls', moderationTestedUrls)
            resolve(data)
          })
        })
      } catch (e) {
        log.error('rekognition.imageModeration:', e)
        return Promise.reject(e)
      }
    },
    isGraphicLabel: (label: ModerationLabel) => {
      if (label.Confidence < 90) return

      return ['Nudity', 'Sexual', 'Gore', 'Bodies', 'Corpses'].some(word => (label.Name || label.ParentName || '').includes(word))
    },
    isGraphic: async (url: string) => {
      try {
        const { ModerationLabels } = await rekognitionService.imageModeration.create(url) as { ModerationLabels: Array<ModerationLabel> }
        return ModerationLabels.some(rekognitionService.imageModeration.isGraphicLabel)
      } catch (e) {
        return Promise.reject(e)
      }
    },
  },
  detectText: {
    create: async (url: string) => {
      if (!url) return Promise.reject({ message: 'invalid url' })

      textDetectedUrls = await cache.get('text_detected_urls') || {}
      const found = textDetectedUrls[url]
      if (found) return {
        cached: true,
        ...found,
      }

      if (textDetectingUrls[url]) return Promise.reject({ message: 'AWS Rekognition still in process... try it again after a while.'})

      textDetectingUrls[url] = true
      try {
        const base64 = await helpers.imageUrlToBlob(url)
        return new Promise((resolve, reject) => {
          rekognition.detectText({
            Image: {
              Bytes: base64,
            },
          }, (err, data) => {
            delete textDetectingUrls[url]
            if (err) reject(err)

            textDetectedUrls[url] = data
            cache.set('text_detected_urls', textDetectedUrls)
            resolve(data)
          })
        })
      } catch (e) {
        log.error('rekognition.detectText:', e)
        return Promise.reject(e)
      }
    },
  },
}

export default rekognitionService
