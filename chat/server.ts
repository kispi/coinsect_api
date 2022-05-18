import { FastifyInstance, FastifyRequest } from 'fastify'
import { IMessage } from './types'
import { SocketStream } from 'fastify-websocket'
import { useRouter } from '../core/router'
import { Message } from '../entities/message'
import helpers from './helpers'
import store from './store'
import IContext from '../core/interfaces/context'
import badWord from '../services/bad_word'
import messageHandler from './message_handler'

const connections = store.getters.connections()

const onConnected = (connection: SocketStream, req: FastifyRequest) => {
  // 웹소켓 접속시 토큰이 query param으로 넘어온 경우 그대로 사용, 없으면 만들어줌
  const token = req.query['token'] || helpers.mustToken(store.getters.tokens())

  store.actions.setUser({ token, connection, ip: req.ip })

  connection.socket.on('close', () => {
    helpers.broadcast({ type: 'leave' })
    const idx = connections.findIndex(conn => conn.connection === connection)
    if (idx >= 0) connections.splice(idx, 1)
  })

  connection.socket.on('message', message => {
    messageHandler({ message, token, ip: req.ip })
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

  app.get('/webchat', { websocket: true }, onConnected)

  // 추후에는 채팅서버와 WebSocket을 연결해서 쭉 유지하면서 티키타카할까 생각중 (연결을 맺었다 끊었다 하면 비용이 크니)
  routes.get('/webchat/users/:token', chatCtrl.users.one, chatCtrl.authApiServer)
  routes.get('/webchat/messages', chatCtrl.messages.all)
  routes.post('/webchat/messages', chatCtrl.messages.send, chatCtrl.authApiServer)
  routes.post('/webchat/messages/broadcast', chatCtrl.messages.broadcast, chatCtrl.authApiServer)
  routes.post('/webchat/messages/invalidate', chatCtrl.messages.invalidate, chatCtrl.authApiServer)
  routes.post('/webchat/ban_ip', chatCtrl.users.ban, chatCtrl.authApiServer)
}

export default useChat