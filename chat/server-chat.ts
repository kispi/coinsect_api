import { FastifyInstance, FastifyRequest } from 'fastify'
import { IConnection, IMessage } from './types'
import { SocketStream } from 'fastify-websocket'
import { useRouter } from '../core/router'
import { Message } from '../entities/message'
import { getConnection } from 'typeorm'
import helpers from './helpers'
import IContext from '../core/context'
import chat from '../services/chat'
import store from '../store'

let connections: Array<IConnection> = []

let sentMessages: Array<IMessage> = []

const latestMessagesLimit = 200

const currentTokens = () => connections.map(conn => conn.user.token)

const asIMessage = message => ({
  type: message.type,
  user: message.user,
  text: message.text,
  numConnections: connections.length - (message.type === 'leave' ? 1 : 0),
  ts: new Date(),
})

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
  sentMessages.push(iMessage)
  sentMessages = sentMessages.slice(-latestMessagesLimit)

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
  }]).execute()
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
      const t = chat.bannedUntil(req.ip)
      if (t) {
        sendMessage({
          message: {
            type: 'alert',
            text: `채팅 제한 해제: ${t}`,
          },
          token,
        })
        return
      }

      chat.banIP(req.ip, store.state.globalVariables.chatFrequency)
      if (!(o.text || '').trim()) return

      if (helpers.includesBadWords(o.text)) {
        sendMessage({
          message: {
            type: 'alert',
            text: '비속어, 음란글, 광고 채팅이 누적되면 사용이 제한될 수 있습니다.',
          },
          token,
        })
        return
      }

      // IP 차단하려면 비속어도 DB에 저장하긴 해야되는데 나중에 따로 bad_word_history 뭐 이런거 만드는게 나을듯
      saveMessage(o, req.ip)

      broadcast(o)
      return
    }
  })
}

const chatCtrl = {
  latest: (c: IContext) => c.res.asJSON(sentMessages),
}

const loadRecentMessages = async () => {
  const orm = getConnection()
  try {
    const data = await orm
      .getRepository(Message)
      .createQueryBuilder()
      .limit(200)
      .orderBy('id', 'DESC')
      .getMany()

    const json = JSON.parse(JSON.stringify(data))
    sentMessages = json.map(o => ({
      type: o.type,
      text: o.text,
      ts: o.ts,
      numConnections: o.numConnections,
      user: {
        token: o.token,
        profile: {
          nickname: o.nickname,
          image: o.image,
        },
      },
    })).reverse()
  } catch (e) {
    return Promise.reject(e)
  }
}

export const useChat = (app: FastifyInstance) => {
  const routes = useRouter(app)

  store.actions.loadBadWords()
  loadRecentMessages()

  app.get('/chat', { websocket: true }, onConnected)

  routes.get('/messages/latest', chatCtrl.latest)
}

export default {
  sendMessage,
  useChat,
}