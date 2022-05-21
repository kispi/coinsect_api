import { FastifyInstance, FastifyRequest } from 'fastify'
import { IMessage } from './types'
import { SocketStream } from 'fastify-websocket'
import { useRouter } from '../core/router'
import { Message } from '../entities/message'
import { log } from '../core/logger'
import helpers from './helpers'
import coreHelpers from '../core/helpers'
import store from './store'
import IContext from '../core/interfaces/context'
import badWord from '../services/bad_word'
import messageHandlers from './message_handler'

const connections = store.getters.connections()

const onConnected = (connection: SocketStream, req: FastifyRequest) => {
  // 웹소켓 접속시 토큰이 query param으로 넘어온 경우 그대로 사용, 없으면 만들어줌
  const token = req.query['token'] || helpers.mustToken()

  store.actions.setUser({ token, connection, ip: req.ip })

  connection.socket.on('close', () => {
    helpers.broadcast({ type: 'leave' })
    const idx = connections.findIndex(conn => conn.connection === connection)
    if (idx >= 0) connections.splice(idx, 1)
  })

  connection.socket.on('message', rawMessage => {
    const message: IMessage = JSON.parse(rawMessage)
    const handler = messageHandlers({ message, token, ip: req.ip })[message.type]
    if (!handler) {
      // message.type은 클라이언트에서 채팅서버로 보낸 메시지의 타입임.
      log.error(`Invalid request: ${req.ip} requested unknown incoming message type '${message.type}'.`)
      return
    }

    handler()
  })
}

const filteredMessages = (messages: Array<IMessage>) => messages.map(m => ({
  ...m,
  text: badWord.filtered(m.text),
}))

const chatCtrl = {
  authApiServer: (c: IContext) => {
    // TODO: 채팅서버가 분리된 이후로는 권한 없을 시 (API서버가 아닌 일반 브라우저에서의 호출 등) Promise.reject해야함.
    // 토큰은 API 서버별 env등에 채팅서버 이용권한 토큰같은걸 넣으면 될듯
  },
  config: (c: IContext) => {
    c.res.success(store.getters.config())
  },
  users: {
    one: (c: IContext) => {
      const token = c.req.params['token']
      if (!token) return c.res.failed({ message: 'user token is missing' })

      const user = store.getters.user(token)
      if (user) c.res.success(user)
      else c.res.failed({ message: 'user not found' })
    },
    ban: (c: IContext) => {
      c.res.success(store.actions.banIP(c.req.body['ip'], c.req.body['timeout']))
    },
    update: (c: IContext) => {
      const profile = c.req.body['profile']
      const token = c.req.params['token']
      if (!profile || !token) return c.res.failed({ message: 'invalid payload' })

      // 토큰을 변조해서 날린 경우 차단
      const user = store.getters.user(token)
      if (!user) return c.res.failed({ message: 'user not found' })

      const trimmedNickname = coreHelpers.sanitize.strict(profile.nickname)
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

      const connections = store.getters.targetConnections({ token })
      connections.forEach(conn => conn.user = user)

      c.res.success(user)
    },
  },
  messages: {
    all: (c: IContext) => {
      const qb = c.orm.getRepository(Message).createQueryBuilder().limit(store.getters.config().numLatestMessages).orderBy('id', 'DESC')
      const cursor = c.req.query['firstMessageId']
      if (cursor) qb.where(`id < ${cursor}`)
      else {
        return c.res.asJSON(filteredMessages(store.getters.recentMessages()))
      }

      qb.getMany()
        .then(data => {
          const json = JSON.parse(JSON.stringify(data))
          c.res.asJSON(filteredMessages(json.map(Message.asIMessage)))
        })
        .catch(c.res.failed)
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
  },
}

export const useChat = (app: FastifyInstance) => {
  const routes = useRouter(app)
  store.actions.loadRecentMessages()
  store.actions.loadUsers()

  app.get('/webchat', { websocket: true }, onConnected)

  routes.get('/webchat/config', chatCtrl.config)

  // 추후에는 채팅서버와 WebSocket을 연결해서 쭉 유지하면서 티키타카할까 생각중 (연결을 맺었다 끊었다 하면 비용이 크니)
  routes.put('/webchat/users/:token', chatCtrl.users.update)
  routes.get('/webchat/messages', chatCtrl.messages.all)

  // API 서버에서 찌르는 API들 (인증 필요))
  routes.get('/webchat/users/:token', chatCtrl.users.one, chatCtrl.authApiServer)
  routes.post('/webchat/messages', chatCtrl.messages.send, chatCtrl.authApiServer)
  routes.post('/webchat/messages/broadcast', chatCtrl.messages.broadcast, chatCtrl.authApiServer)
  routes.post('/webchat/messages/invalidate', chatCtrl.messages.invalidate, chatCtrl.authApiServer)
  routes.post('/webchat/ban_ip', chatCtrl.users.ban, chatCtrl.authApiServer)
}

export default useChat