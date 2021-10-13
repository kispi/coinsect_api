import dayjs = require('dayjs')
import store from '../store'
import { BannedUser } from '../entities/banned_user'
const crypto = require('crypto')
const sanitizeHtml = require('sanitize-html')

const sanitize = {
  // html 컨텐츠의 경우는 특정 태그들은 허용할 필요가 있음.
  html: text => {
    const d = sanitizeHtml.defaults

    return sanitizeHtml(text, {
      allowedTags: d.allowedTags.concat(['img']),
      allowedAttributes: {
        'a': ['href', 'target', 'rel'],
        'img': ['src'],
        '*': ['style', 'class'],
      },
      allowedStyles: {
        '*': {
          'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
          'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
          'text-align': [/^left$/, /^right$/, /^center$/],
          'font-size': [/^\d+(?:px)$/],
          'font-weight': [/^\d+/],
        },
      }
    })
  },
  // 어떤 html도 허용하지 않는다.
  strict: text => sanitizeHtml(text, { allowedTags: [] }),
}

const helpers = {
  // 나중에 구현
  sanitize,
  dayjs,
  case: {
    pluralize: (str: string) => {
      if (str.endsWith('day')) return `${str}s`
      if (str.endsWith('way')) return `${str}s`
      if (str.endsWith('y')) return `${str.slice(0, -1)}ies`
      if (str.endsWith('s') || str.endsWith('h')) return `${str}es`
  
      return `${str}s`
    },
  },
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
  generateUUID: () => {
    let d = new Date().getTime()
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (d + Math.random() * 16) % 16 | 0
      d = Math.floor(d / 16)
      return (c === 'x' ? r : (r&0x3|0x8)).toString(16)
    })
    return uuid
  },
  includesBadWords: (message: string) => store.state.badWords.map(o => o.word).some(badWord => message.includes(badWord)),
  useBannedUser: (ip: string): BannedUser => store.state.bannedUsers.find(u => u.ip === ip)
}

export default helpers