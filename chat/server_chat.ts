import { FastifyInstance, FastifyRequest } from 'fastify'
import { IConnection, IMessage } from './types'
import { SocketStream } from 'fastify-websocket'
import { useRouter } from '../core/router'
import { Message } from '../entities/message'
import { getConnection } from 'typeorm'
import helpers from './helpers'
import coreHelpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import badWord from '../services/bad_word'
import chat from '../services/chat'
import store from '../store'
import useCache from '../core/cache'

const cache = useCache()

let connections: IConnection[] = []

let users = cache.get('chat:users') || {}

const currentTokens = () => connections.map(conn => conn.user.token)

const getUser = (token: string) => users[token]

const createUser = (token: string) => ({
  token,
  profile: {
    nickname: helpers.recommendNickname(),
  },
})

const getTargetConnections = ({ ip, token }: { ip?: string, token?: string }) => connections.filter(conn => {
  if (ip) return conn.ip === ip
  if (token) return conn.user.token === token
})

// token은 받는 사람의 토큰이고, message.user.token은 보낸 사람의 토큰이다.
const sendMessage = ({ message, token, ip }: { message, token?: string, ip?: string }) => {
  const targetConnections = getTargetConnections({ ip, token })

  // 프로필은 클라이언트에서 준 토큰만을 가지고 찾아서 assign
  if (message.user) {
    const user = getUser(message.user.token)
    message.user.profile = user.profile
  }
  const finalMessage = helpers.asIMessage(message, connections)

  targetConnections.forEach(connectionWrapper => connectionWrapper.connection.socket.send(JSON.stringify(finalMessage)))
}

const saveMessage = (message, ip) => {
  if (message.type !== 'text') return

  if (!message.user || !message.user.token) return

  const iMessage = helpers.asIMessage(message, connections)
  store.state.recentMessages.unshift(iMessage)
  store.state.recentMessages = store.state.recentMessages.slice(0, store.state.globalVariables.numLatestMessages)

  const orm = getConnection()
  const row = {
    ip,
    ts: iMessage.ts,
    numConnections: iMessage.numConnections,
    type: iMessage.type,
    text: iMessage.text,
  }
  const user = getUser(message.user.token)
  if (user) {
    row['nickname'] = user.profile.nickname
    row['image'] = user.profile.image
    row['token'] = user.token
  }

  orm.createQueryBuilder().insert().into(Message).values([row])
    .execute().then(store.actions.loadRecentMessages) // INSERT 이후 loadRecentMessages를 해줘야, 캐시에 있는 가장 최근에 삽입된 message의 id가 채워진다.
}

// 메시지를 접속된 클라이언트들에게 뿌리고 서버 메모리에 저장한다. (나중에 redis pubsub으로 변경)
const broadcast = message => {
  // 동일 유저가 n >= 2개 이상의 커넥션을 만든 경우 (새 탭 등) sendMessage를 한 번만 하기 위해 해시로 필터링한다.
  // (그냥 connections.forEach(conn => sendMessage...) 하게 되면 같은 계정 n개 탭에서 접속한 경우 걔들은 메시지 n번씩 찍힘)
  const o = {}
  connections.forEach(conn => o[conn.user.token] = conn)
  Object.values(o).forEach((conn: IConnection) => sendMessage({ message, token: conn.user.token }))
}

const onConnected = (connection: SocketStream, req: FastifyRequest) => {
  // 웹소켓 접속시 토큰이 query param으로 넘어온 경우 그대로 사용, 없으면 만들어줌
  const token = req.query['token'] || helpers.mustToken(currentTokens())

  // 해당 토큰의 유저 계정이 있으면 사용, 없으면 만들어줌
  const user = getUser(token) || createUser(token)
  users[token] = user
  cache.set('chat:users', users)
  connections.push({ connection, user, ip: req.ip })

  sendMessage({ message: { type: 'auth', user }, token })

  connection.socket.on('close', () => {
    broadcast({ type: 'leave' })
    const idx = connections.findIndex(conn => conn.connection === connection)
    if (idx >= 0) connections.splice(idx, 1)
  })

  connection.socket.on('message', message => {
    const o: IMessage = JSON.parse(message)
    if (o.type === 'text') {
      const bannedUser = coreHelpers.useBannedUser(req.ip)
      if (bannedUser) {
        sendMessage({
          message: {
            type: 'alert',
            text: `채팅 제한 해제: ${coreHelpers.formatWithAdd({ date: bannedUser.until })}`,
          },
          token,
        })
        return
      }

      const t = chat.bannedUntil(req.ip)
      if (t) {
        sendMessage({
          message: {
            type: 'alert',
            text: `채팅 제한 해제: ${coreHelpers.formatWithAdd({ date: t })}`,
          },
          token,
        })
        return
      }

      chat.banIP(req.ip, store.state.globalVariables.lastUserActionTimeouts.message)
      if (!(o.text || '').trim() || o.text.length > store.state.globalVariables.maxlength.message) return

      // IP 차단하려면 비속어도 DB에 저장하긴 해야되는데 나중에 따로 bad_word_history 뭐 이런거 만드는게 나을듯
      saveMessage(o, req.ip)

      if (badWord.includedIn(o.text)) o.text = badWord.filtered(o.text)
      broadcast(o)
      return
    }

    if (o.type === 'connections') {
      sendMessage({
        message: {
          type: 'connections',
          meta: connections.map(conn => ({ ip: conn.ip, user: conn.user })),
        }, token,
      })
    }

    if (o.type === 'ping') {
      sendMessage({
        message: {
          type: 'pong'
        },
        token,
      })
    }

    if (o.type === 'account' && (o.user || {}).token && (o.user || {}).profile) {
      const user = getUser(o.user.token)
      user.profile.nickname = coreHelpers.sanitize.strict(o.user.profile.nickname)
      const connections = getTargetConnections({ token: o.user.token })
      connections.forEach(conn => {
        o.user = user
        conn.user = o.user
      })

      sendMessage({
        message: {
          type: 'account',
          user: o.user,
        },
        token,
      })
    }
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
      const token = c.req.query['token']
      if (!token) return c.res.failed({ message: 'user token is missing' })

      c.res.success(getUser(token))
    },
  },
  messages: {
    all: (c: IContext) => {
      const qb = c.orm.getRepository(Message).createQueryBuilder().limit(store.state.globalVariables.numLatestMessages).orderBy('id', 'DESC')
      const cursor = c.req.query['firstMessageId']
      if (cursor) qb.where(`id < ${cursor}`)
      else {
        return c.res.asJSON(filteredMessages(store.state.recentMessages))
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

      sendMessage({ message, ip, token })
      c.res.success()
    },
    broadcast: (c: IContext) => {
      const message = c.req.body['message']
      if (!message) return c.res.failed({ message: 'message is required' })

      broadcast(message)
      c.res.success()
    },
  },
}

export const useChat = (app: FastifyInstance) => {
  const routes = useRouter(app)

  app.get('/webchat', { websocket: true }, onConnected)

  // 추후에는 채팅서버와 WebSocket을 연결해서 쭉 유지하면서 티키타카할까 생각중 (연결을 맺었다 끊었다 하면 비용이 크니)
  routes.get('/webchat/messages', chatCtrl.messages.all)
  routes.post('/webchat/messages', chatCtrl.messages.send, chatCtrl.authApiServer)
  routes.post('/webchat/messages/broadcast', chatCtrl.messages.broadcast, chatCtrl.authApiServer)
  routes.get('/webchat/users/:token', chatCtrl.users.one, chatCtrl.authApiServer)
}

export default useChat