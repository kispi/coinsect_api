import { BannedUser } from '../../entities/banned_user'
import { Reply } from '../../entities/reply'
import { parse } from 'node-html-parser'
import dayjs = require('dayjs')
import crypto from './crypto'
import store from '../../store'
import caseHelpers from './case'
import sanitize from './sanitize'
import jwt from './jwt'
import axios from 'axios'

const helpers = {
  // 나중에 구현
  sanitize,
  jwt,
  dayjs,
  crypto,
  regex: {
    url: /\b(?:https?|ftp):\/\/[a-z0-9-+&@#/%?=~_|!:,.;]*[a-z0-9-+&@#/%=~_|]/gim,
    pseudoUrl: /(^|[^/])(www\.[\S]+(\b|$))/gim,
    email: /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim,
  },
  retrieveUrlFromString: (url: string) => ((url || '').match(helpers.regex.url) || [])[0],
  isImageUrl: (url: string) =>
    ['.png', '.jpeg', '.jpg', '.jfif', '.svg', '.bmp', '.webp', '.gif'].some(ext => (url || '').toLowerCase().endsWith(ext)),
  useCdn: (key: string) => `${store.state.serverConfig.AWS_S3_CDN}/${key}`,
  case: caseHelpers,
  /**
 * trim values listed in fields and check if it's empty.
 * NOTE: This mutates the payload body by trimming. (EX: ' Hello world ' => 'Hello world')
 * However, mostly you don't want to store empty values if those are required anyway.
 * @param c
 * @param fields
 */
  trimAndValidateRequiredFields: (payload, fields: string[]) => fields.every(field => {
    payload[field] = (payload[field] || '').trim()
    return payload[field]
  }),
  allNewlineTrimmed: (text: string) => {
    if (!text) return

    return text.split('\n').map(line => line.trim()).join('\n').trim()
  },
  includesBadWords: (message: string) => store.state.badWords.map(o => o.word).some(badWord => message.includes(badWord)),
  useBannedUser: ({ ip, token }: { ip?: string, token?: string }): BannedUser => {
    if (!ip && !token) return

    return store.state.bannedUsers.filter(o => dayjs().isBefore(o.until)).find(u => u.ip === ip || u.token === token)
  },
  parseImageSources: (content: string) => {
    try {
      return parse(content).getElementsByTagName('img').map(o => o.attributes.src)
    } catch (e) {
      return []
    }
  },
  // server_modules.ts의 전역 axios 인터셉터가 res.data만 돌려주므로 실제 반환값은 응답 본문(Buffer)이다.
  imageUrlToBlob: async (imageUrl: string): Promise<Uint8Array<ArrayBuffer>> => {
    try {
      return await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      }) as unknown as Uint8Array<ArrayBuffer>
    } catch (e) {
      return Promise.reject(e)
    }
  },
  imageUrlToBase64String: async (imageUrl: string) => {
    try {
      const data = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      })
      return Buffer.from(data as any).toString('base64')
    } catch (e) {
      return Promise.reject(e)
    }
  },
  parseHref: (content: string) => (content.match(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/) || [])[2],
  organizeReplies: replies => {
    if ((replies || []).length === 0) return []

    replies.forEach((item: Reply) => {
      if (item.deletedAt) item.content = ''

      if (!item.parent) return

      const parent = replies.find(possibleParent => possibleParent.id === (item.parent || {}).id) as Reply
      if (!parent) return

      parent.replies ? parent.replies.push(item) : parent.replies = [item]
    })

    return replies.filter(f => !f.parent)
  },
  now: () => {
    const ts = process.hrtime()
    return (ts[0] * 1e3) + (ts[1] / 1e6)
  },
  debounce(fn: Function, delay: number) {
    let timeoutID

    return function() {
      clearTimeout(timeoutID)
      timeoutID = setTimeout(() => {
        fn.apply(this, arguments)
      }, delay)
    }
  },
  prettyPrice: (price: number) => {
    let numFracs = 0
    if (Math.abs(price) < 100) numFracs = 2
    if (Math.abs(price) < 1) numFracs = 4
    if (Math.abs(price) < 0.0001) numFracs = 8

    if (price === 0) numFracs = 2

    return price.toLocaleString(undefined, {
      maximumFractionDigits: numFracs,
      minimumFractionDigits: numFracs,
    })
  }
}

export default helpers