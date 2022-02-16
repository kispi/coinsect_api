const crypto = require('crypto')
const slugid = require('slugid')
import dayjs = require('dayjs')
import store from '../../store'
import { BannedUser } from '../../entities/banned_user'
import { Reply } from '../../entities/reply'
import { parse } from 'node-html-parser'
import seo from './seo'
import sanitize from './sanitize'

const helpers = {
  // 나중에 구현
  sanitize,
  dayjs,
  seo,
  case: {
    pluralize: (str: string) => {
      if (str.endsWith('day')) return `${str}s`
      if (str.endsWith('way')) return `${str}s`
      if (str.endsWith('y')) return `${str.slice(0, -1)}ies`
      if (str.endsWith('s') || str.endsWith('h')) return `${str}es`
  
      return `${str}s`
    },
    toCapital: str => str.charAt(0).toUpperCase() + str.slice(1),
  },
  useS3: key => `https://coinsect-production.s3.ap-northeast-2.amazonaws.com/${key}`,
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
  hashed: (raw: string) => crypto.createHash('sha256').update(raw).digest('base64'),
  compare: (hashed: string, raw: string) =>
    hashed &&
    raw &&
    crypto.createHash('sha256').update(raw).digest('base64') === hashed
  ,
  slugid,
  generateUUID: (asBase64?: boolean) => {
    const slug = slugid.v4()

    if (asBase64) return slug

    const uuid = slugid.decode(slug)
    return uuid
  },
  includesBadWords: (message: string) => store.state.badWords.map(o => o.word).some(badWord => message.includes(badWord)),
  useBannedUser: (ip: string): BannedUser => store.state.bannedUsers.find(u => u.ip === ip),
  parseImageSources: (content: string) => {
    try {
      return parse(content).getElementsByTagName('img').map(o => o.attributes.src)
    } catch (e) {
      return []
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
  retrieveNumbersOnly: (str: string) => str.replace(/[^0-9]+/g, ''),
}

export default helpers