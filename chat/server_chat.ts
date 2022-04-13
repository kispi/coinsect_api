import { FastifyInstance, FastifyRequest } from 'fastify'
import { IConnection, IMessage } from './types'
import { SocketStream } from 'fastify-websocket'
import { useRouter } from '../core/router'
import { Message } from '../entities/message'
import { getConnection } from 'typeorm'
import helpers from './helpers'
import coreHelpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import chat from '../services/chat'
import store from '../store'

let connections: IConnection[] = []

const currentTokens = () => connections.map(conn => conn.user.token)

const asIMessage = message => {
  const iMessage = {
    type: message.type,
    user: message.user,
    text: message.text,
    numConnections: connections.length - (message.type === 'leave' ? 1 : 0),
    ts: new Date(),
  }

  if (message.meta) iMessage['meta'] = message.meta
  return iMessage
}

export const sendMessage = ({ message, token, ip }: { message, token?: string, ip?: string }) => {
  const targetConnections = connections.filter(conn => {
    if (ip) return conn.ip === ip
    if (token) return conn.user.token === token
  })

  const finalMessage = asIMessage(message)

  targetConnections.forEach(connectionWrapper => connectionWrapper.connection.socket.send(JSON.stringify(finalMessage)))
}

const saveMessage = (message, ip) => {
  if (message.type !== 'text') return

  const iMessage = asIMessage(message)
  store.state.recentMessages.unshift(iMessage)
  store.state.recentMessages = store.state.recentMessages.slice(0, store.state.globalVariables.numLatestMessages)

  const orm = getConnection()
  orm.createQueryBuilder().insert().into(Message).values([{
    ip,
    ts: iMessage.ts,
    numConnections: iMessage.numConnections,
    type: iMessage.type,
    text: iMessage.text,
    nickname: iMessage.user.profile.nickname,
    image: iMessage.user.profile.image,
    token: iMessage.user.token,
  }]).execute().then(store.actions.loadRecentMessages) // INSERT 이후 loadRecentMessages를 해줘야, 캐시에 있는 가장 최근에 삽입된 message의 id가 채워진다.
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

  connections.push({ connection, user: { token }, ip: req.ip })

  sendMessage({ message: { type: 'auth', user: { token } }, token })

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
      if (!(o.text || '').trim()) return

      if (coreHelpers.includesBadWords(o.text)) {
        sendMessage({
          message: {
            type: 'alert',
            text: '비속어, 음란글, 광고 채팅이 누적되면 사용이 제한될 수 있습니다.',
          },
          token,
        })
        return
      }

      o.user.profile.nickname = coreHelpers.sanitize.strict(o.user.profile.nickname)

      if (
        !(o.text || '').trim() ||
        !(o.user.profile.nickname || '').trim()
      ) return

      // IP 차단하려면 비속어도 DB에 저장하긴 해야되는데 나중에 따로 bad_word_history 뭐 이런거 만드는게 나을듯
      saveMessage(o, req.ip)

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
  })
}

const chatCtrl = {
  messages: {
    all: (c: IContext) => {
      const qb = c.orm.getRepository(Message).createQueryBuilder().limit(store.state.globalVariables.numLatestMessages).orderBy('id', 'DESC')
      const cursor = c.req.query['firstMessageId']
      if (cursor) qb.where(`id < ${cursor}`)
      else {
        return c.res.asJSON(store.state.recentMessages)
      }

      qb.getMany()
        .then(data => {
          const json = JSON.parse(JSON.stringify(data))
          c.res.asJSON(json.map(Message.asIMessage))
        })
        .catch(c.res.failed)
    },
  },
}

export const useChat = (app: FastifyInstance) => {
  const routes = useRouter(app)

  app.get('/chat', { websocket: true }, onConnected)

  routes.get('/messages', chatCtrl.messages.all)
}

export default {
  sendMessage,
  useChat,
}