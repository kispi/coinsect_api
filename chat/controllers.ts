import coreHelpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import store from './store'
import helpers from './helpers'
import badWord from '../services/bad_word'
import firebase from '../services/firebase'
import messageHandlers from './message_handler'
import { Message } from '../entities/message'
import { IMessage, IUser, IUserSetting } from './types'
import { SocketStream } from '@fastify/websocket'
import { FastifyRequest } from 'fastify'
import { createHttpLog, log } from '../core/logger'

const connections = store.getters.connections()

// 너무 짧은 시간에 수많은 소켓에 브로드캐스트하면 부하가 심해서, 특정 계정에 국한되지 않은 업데이트는 디바운스를 줌
const debouncedBroadcast = type => coreHelpers.debounce(() => {
  store.actions.loadStats()
  helpers.broadcast({ type })
}, 500)

export const onConnected = (connection: SocketStream, req: FastifyRequest) => {
  // 웹소켓 접속시 토큰이 query param으로 넘어온 경우 그대로 사용, 없으면 만들어줌
  const token = req.query['token'] || helpers.mustToken()

  store.actions.setUser({ token, connection, ip: req.ip })
  store.actions.setUserSetting(token)

  // 유저 접속시 통계 업데이트
  debouncedBroadcast('enter')()

  connection.socket.on('close', () => {
    const idx = connections.findIndex(conn => conn.connection === connection)
    if (idx >= 0) connections.splice(idx, 1)

    // 유저 접속 끊길시 통계 업데이트
    debouncedBroadcast('leave')()
  })

  connection.socket.on('error', error => {
    log.error('websocket error:', error)
    log.error(JSON.stringify(createHttpLog(req, null)))
  })

  connection.socket.on('message', rawMessage => {
    try {
      const message: IMessage = JSON.parse(rawMessage)
      const handler = messageHandlers({ message, token, ip: req.ip })[message.type]
      // 클라가 잘못된 요청(deprecated된 API 호출이라든지)을 하면 새로고침하도록 요청함.
      if (!handler) {
        // message.type은 클라이언트에서 채팅서버로 보낸 메시지의 타입임.
        log.error(`Invalid request: ${req.ip} requested unknown incoming message type '${message.type}'.`)
        helpers.sendMessage({
          message: {
            type: 'forceRefresh',
          },
          token,
        })
        return
      }

      handler()
    } catch (e) {
      log.error(`Invalid request: ${req.ip} sent corrupted JSON string: ${rawMessage}`)
    }
  })
}

const filteredMessages = (messages: Array<IMessage>) => messages.map(m => ({
  ...m,
  text: (m.type === 'text') ? badWord.filtered(m.text) : m.text,
}))

export const chatCtrl = {
  authApiServer: (c: IContext) => {
    // TODO: 채팅서버가 분리된 이후로는 권한 없을 시 (API서버가 아닌 일반 브라우저에서의 호출 등) Promise.reject해야함.
    // 토큰은 API 서버별 env등에 채팅서버 이용권한 토큰같은걸 넣으면 될듯
  },
  config: {
    get: (c: IContext) => c.res.asJSON(store.getters.config()),
    post: (c: IContext) => {
      store.getters.config().allowImageMessage = c.req.body['allowImageMessage']
      c.res.asJSON(store.getters.config())
    },
  },
  sendPushNotification: async (c: IContext) => {
    const notification = c.req.body
    const tokens = Object.values(store.getters.userSettings() || {}).filter((s: IUserSetting) => {
      return s.deviceToken && s.pushPositionChange
    }).map((s: IUserSetting) => s.deviceToken) || []

    if (tokens.length === 0) return c.res.success()

    if (notification['body']) notification['body'] = coreHelpers.allNewlineTrimmed(notification['body'])

    try {
      await firebase.messaging.send({
        tokens,
        webpush: {
          notification,
          fcmOptions: {
            link: notification['link'],
          },
        },
      })
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  user: {
    all: (c: IContext) => {
      try {
        const q = c.req.query

        const users = Object.values(store.getters.users()) as Array<IUser>
        users.forEach(user => user['setting'] = store.getters.userSetting(user.token))
        let filtered = users
        if (q['where']) {
          const stmts = decodeURI(q['where']).split(' AND ')
          const pairs = stmts.map(stmt => {
            const [a, b] = stmt.split(' LIKE ')
            const splitted = a.split('.')
            return {
              key: coreHelpers.case.toCamel(splitted[splitted.length - 1]),
              value: b.replace(/[%"]/g, ''),
            }
          })

          pairs.forEach(pair => {
            if (pair.key === 'nickname') filtered = filtered.filter(u => (u.profile.nickname || '').includes(pair.value))
            if (pair.key === 'image') filtered = filtered.filter(u => (u.profile.image || '').includes(pair.value))
            if (pair.key === 'path') filtered = filtered.filter(u => (u.path || '').includes(pair.value))
            if (pair.key === 'token') filtered = filtered.filter(u => (u.token || '').includes(pair.value))
            if (pair.key === 'deviceToken') filtered = filtered.filter(u => {
              if (!u['setting']) return

              return (u['setting']['deviceToken'] || '').includes(pair.value)
            })
            if (pair.key === 'lastSeen') filtered = filtered.filter(u => (u.lastSeen.toString() || '').includes(pair.value))
            if (pair.key === 'lastIP') filtered = filtered.filter(u => (u.lastIP || '').includes(pair.value))
          })
        }

        if (q['sort']) {
          const sign = q['order'] === 'desc' ? -1 : 1
          const c = q['sort']
          filtered.sort((a, b) => {
            if (a[c] && b[c]) return a[c] > b[c] ? sign : -sign

            if (!a[c]) return -sign

            if (!b[c]) return sign
          })
        }

        c.res.asJSON({
          data: filtered.slice(
            parseInt(q['offset']) || 0,
            (parseInt(q['offset']) || 0) + (parseInt(q['limit']) || 0),
          ),
          total: filtered.length,
        })
      } catch (e) {
        c.res.failed()
      }
    },
    one: (c: IContext) => {
      const token = c.req.params['token']
      if (!token) return c.res.failed({ message: 'user token is missing' })

      const user = store.getters.user(token)
      if (user) c.res.asJSON(user)
      else c.res.failed({ message: 'user not found' })
    },
    ban: (c: IContext) => c.res.asJSON(store.actions.banIP(c.req.body['ip'], c.req.body['timeout'])),
    update: (c: IContext) => {
      const profile = c.req.body['profile']
      const token = c.req.params['token']
      if (!profile || !token) return c.res.failed({ message: 'invalid payload' })

      // 토큰을 변조해서 날린 경우 차단
      const user = store.getters.user(token)
      if (!user) return c.res.failed({ message: 'user not found' })

      const trimmedNickname = coreHelpers.allNewlineTrimmed(coreHelpers.sanitize.strict(profile.nickname))
      if (!trimmedNickname) return c.res.failed({ message: '닉네임은 빈 문자열로 설정할 수 없습니다' })
      user.profile.nickname = trimmedNickname

      if (user.profile.nickname.length > store.getters.config().nicknameMaxLength) return c.res.failed({ message: '닉네임이 너무 깁니다' })

      if (profile.image) {
        const trimmedImageUrl = coreHelpers.sanitize.strict(profile.image)

        const l = store.getters.config().imageUrlMaxLength
        if (trimmedImageUrl.length > l) return c.res.failed({ message: `이미지 URL 길이가 ${trimmedImageUrl.length}입니다. 죄송하지만 ${l}자 이내의 것으로 사용해주세요` })
        user.profile.image = trimmedImageUrl

        if (!profile.image.startsWith('http')) return c.res.failed({ message: '올바른 이미지 URL이 아닙니다. (http로 시작하는 주소를 사용해주세요)' })
      } else {
        delete user.profile.image
      }

      if (profile.sentiment && ['long', 'short'].indexOf(profile.sentiment.type) >= 0) {
        profile.sentiment.expireAt = helpers.dayjs().add(24, 'hours').format()
        user.profile.sentiment = profile.sentiment
        store.actions.loadStats()
      }

      const connections = store.getters.targetConnections({ token })
      connections.forEach(conn => conn.user = user)

      helpers.broadcast({ type: 'update' })

      c.res.asJSON(user)
    },
    updateSetting: (c: IContext) => {
      const payload = c.req.body
      const token = c.req.params['token']
      if (!payload || !token) return c.res.failed({ message: 'invalid payload' })

      const user = store.getters.user(token)
      if (!user) return c.res.failed({ message: 'user not found' })

      const userSetting = store.getters.userSetting(token) || store.actions.createUserSetting(token)
      const updatableFields = ['deviceToken', 'pushChatNewMessage', 'pushPositionChange']
      updatableFields.forEach(field => {
        if (typeof payload[field] !== 'undefined') userSetting[field] = payload[field]
      })

      store.actions.setUserSetting(token)
      c.res.asJSON(userSetting)
    },
    delete: (c: IContext) => {
      const token = c.req.params['token']
      if (!token) return c.res.failed({ message: 'invalid request' })

      store.actions.deleteUser(token)
      c.res.success()
    },
    deleteOld: (c: IContext) => {
      store.actions.deleteOldUsers(c.req.query['hoursPassed'] || 48)
      c.res.success()
    },
  },
  message: {
    all: async (c: IContext) => {
      const limit = c.req.query['limit']
      if (parseInt(limit) >= 1000) {
        c.res.failed({ message: 'limit is too big' })
        return
      }

      const qb = c.orm.getRepository(Message).createQueryBuilder().limit(limit || store.getters.config().numLatestMessages).orderBy('id', 'DESC')
      const cursor = c.req.query['firstMessageId']
      if (cursor) qb.where(`id < ${cursor}`)
      else {
        return c.res.asJSON(filteredMessages(store.getters.recentMessages()))
      }

      try {
        const data = await qb.getMany()
        const json = JSON.parse(JSON.stringify(data))
        c.res.asJSON(filteredMessages(json.map(helpers.asIMessage)))
      } catch (e) {
        log.error('chatCtrl.messages.all:', e)
        c.res.error()
      }
    },
    send: (c: IContext) => {
      const message = c.req.body['message']
      if (!message) return c.res.failed({ message: 'message is required' })

      const ip = c.req.body['ip']
      const token = c.req.body['token']
      if (!message) return c.res.failed({ message: 'message is required' })
      if (!ip && !token) return c.res.failed({ message: 'either ip or token is required to determine who to send the message' })

      helpers.sendMessage({ message, ip, token })
      c.res.success()
    },
    broadcast: (c: IContext) => {
      const message = c.req.body['message']
      if (!message) return c.res.failed({ message: 'message is required' })

      helpers.broadcast(message)
      c.res.success()
    },
    invalidate: (c: IContext) => {
      store.actions.loadRecentMessages().then(() => c.res.success())
    },
    hideMessage: (c: IContext) => {
      const messageId = parseInt(c.req.params['id'])
      if (!messageId) return

      helpers.broadcast({
        type: 'hideMessage',
        meta: { messageId },
      })
    },
  },
}