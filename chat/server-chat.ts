import { FastifyInstance, FastifyRequest } from 'fastify'
import { IConnection, IMessage } from './types'
import { SocketStream } from 'fastify-websocket'
import { useRouter } from '../core/router'
import helpers from './helpers'
import IContext from '../core/context'
import { Message } from '../entities/message'
import { getConnection } from 'typeorm'

let connections: Array<IConnection> = []

let sentMessages: Array<IMessage> = []

// 너무 단시간에 많은 채팅을 치는 것을 막기 위해 이 해시에 IP가 있는 동안은 broadcast를 막는다.
const preventSpam = {
  timeout: 200,
  IPAddresses: {}
}

const latestMessagesLimit = 200

const currentTokens = () => connections.map(conn => conn.user.token)

const asIMessage = message => ({
  type: message.type,
  user: message.user,
  text: message.text,
  numConnections: connections.length - (message.type === 'leave' ? 1 : 0),
  ts: new Date(),
})

const sendMessage = (message, tokenOfTarget: string) => {
  const targetConnections = connections.filter(conn => conn.user.token === tokenOfTarget)

  const finalMessage = asIMessage(message)

  targetConnections.forEach(connectionWrapper => connectionWrapper.connection.socket.send(JSON.stringify(finalMessage)))
}

const insertMessage = (message, ip) => {
  if (message.type !== 'text') return

  const iMessage = asIMessage(message)
  sentMessages.push(iMessage)
  sentMessages = sentMessages.slice(-latestMessagesLimit)

  if (process.env.NODE_ENV !== 'production') return

  const orm = getConnection()
  orm.createQueryBuilder().insert().into(Message).values([{
    ip,
    json: helpers.mustJSON.stringify(iMessage),
  }]).execute()
}

// 메시지를 접속된 클라이언트들에게 뿌리고 서버 메모리에 저장한다. (나중에 redis pubsub으로 변경)
const broadcast = message => {
  // 동일 유저가 n >= 2개 이상의 커넥션을 만든 경우 (새 탭 등) sendMessage를 한 번만 하기 위해 해시로 필터링한다.
  // (그냥 connections.forEach(conn => sendMessage...) 하게 되면 같은 계정 n개 탭에서 접속한 경우 걔들은 메시지 n번씩 찍힘)
  const o = {}
  connections.forEach(conn => o[conn.user.token] = conn)
  Object.values(o).forEach((conn: IConnection) => sendMessage(message, conn.user.token))
}

const onConnected = (connection: SocketStream, req: FastifyRequest) => {
  // 웹소켓 접속시 토큰이 query param으로 넘어온 경우 그대로 사용, 없으면 만들어줌
  const token = req.query['token'] || helpers.mustToken(currentTokens())

  connections.push({ connection, user: { token } })

  sendMessage({ type: 'auth', user: { token } }, token)

  connection.socket.on('close', () => {
    broadcast({ type: 'leave' })
    const idx = connections.findIndex(conn => conn.connection === connection)
    if (idx >= 0) connections.splice(idx, 1)
  })

  connection.socket.on('message', message => {
    const o: IMessage = JSON.parse(message)
    if (o.type === 'text') {
      if (preventSpam.IPAddresses[req.ip]) return

      preventSpam.IPAddresses[req.ip] = true
      setTimeout(() => delete preventSpam.IPAddresses[req.ip], preventSpam.timeout)

      if (!(o.text || '').trim()) return

      insertMessage(o, req.ip)

      if (helpers.includesBadWords(o.text)) {
        sendMessage({
          type: 'alert',
          text: '비속어, 음란글, 광고 채팅이 누적되면 사용이 제한될 수 있습니다.',
        }, token)
        return
      }

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
      .createQueryBuilder('')
      .select()
      .limit(200)
      .orderBy('id', 'DESC')
      .execute()

    const json = JSON.parse(JSON.stringify(data))
    sentMessages = json.map(o => JSON.parse(o.Message_json)).reverse()
  } catch (e) {
    return Promise.reject(e)
  }
}

const useChat = (app: FastifyInstance) => {
  const routes = useRouter(app)

  loadRecentMessages()

  app.get('/chat', { websocket: true }, onConnected)

  routes.get('/messages/latest', chatCtrl.latest)
}

export default useChat