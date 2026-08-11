import {
  RekognitionClient,
  DetectModerationLabelsCommand,
  DetectTextCommand,
  ModerationLabel,
} from '@aws-sdk/client-rekognition'
import { log } from '../../core/logger'
import useCache from '../../core/cache'
import helpers from '../../core/helpers'
import store from '../../store'

const cache = useCache()

let moderationTestedUrls = {}
let moderationTestingUrls = {}

let textDetectedUrls = {}
let textDetectingUrls = {}

const rekognition = new RekognitionClient({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: store.state.serverConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: store.state.serverConfig.AWS_SECRET_ACCESS_KEY,
  },
})

const rekognitionService = {
  imageModeration: {
    examples: () => [
      { name: '찐반인가', src: 'https://coinpan.com/files/attach/images/181338187/476/174/249/14fd2ec990bafcac5bfacee54f22c956.jpeg' },
      { name: '톰 하디', src: 'https://pyxis.nymag.com/v1/imgs/bb3/b19/8af5aabd2330e035c03fa67633b0945fcd-18-tom-hardy.2x.rvertical.w330.jpg' },
      { name: '두아 리파', src: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Dua_Lipa_with_Warner_Music_3.png' },
      { name: '살색 의상', src: 'http://thumbnail.10x10.co.kr/webimage/image/add1/201/A002015710_01-12.jpg?cmd=thumb&w=400&h=400&fit=true&ws=false' },
      { name: '톰 하디 흡연', src: 'https://i.pinimg.com/564x/3e/1b/a2/3e1ba2b8f6ed61c4d1b4349390ecbd19.jpg' },
      { name: '음주', src: 'https://d1085v6s0hknp1.cloudfront.net/chat/8e246c16-d9de-48fb-a516-f2d92e1ed48f_20220827_223728.jpg' },
    ],
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
        const bytes = await helpers.imageUrlToBlob(url)
        const data = await rekognition.send(new DetectModerationLabelsCommand({
          Image: {
            Bytes: bytes,
          },
        }))

        moderationTestedUrls[url] = data
        cache.set('moderation_tested_urls', moderationTestedUrls)
        return data
      } catch (e) {
        log.error('rekognition.imageModeration:', e)
        return Promise.reject(e)
      } finally {
        delete moderationTestingUrls[url]
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
        const bytes = await helpers.imageUrlToBlob(url)
        const data = await rekognition.send(new DetectTextCommand({
          Image: {
            Bytes: bytes,
          },
        }))

        textDetectedUrls[url] = data
        cache.set('text_detected_urls', textDetectedUrls)
        return data
      } catch (e) {
        log.error('rekognition.detectText:', e)
        return Promise.reject(e)
      } finally {
        delete textDetectingUrls[url]
      }
    },
  },
}

export default rekognitionService
