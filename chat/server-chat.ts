import { FastifyInstance, FastifyRequest } from 'fastify'
import { IConnection, IMessage } from './types'
import { SocketStream } from 'fastify-websocket'
import useResponse from '../core/response'
import helpers from './helpers'

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

const sendMessage = (message, tokenOfTarget: string) => {
  const targetConnections = connections.filter(conn => conn.user.token === tokenOfTarget)

  const finalMessage = asIMessage(message)

  targetConnections.forEach(connectionWrapper => connectionWrapper.connection.socket.send(JSON.stringify(finalMessage)))
}

// 메시지를 접속된 클라이언트들에게 뿌리고 서버 메모리에 저장한다. (나중에 redis pubsub으로 변경)
const broadcast = message => {
  // 동일 유저가 n >= 2개 이상의 커넥션을 만든 경우 (새 탭 등) sendMessage를 한 번만 하기 위해 해시로 필터링한다.
  // (그냥 connections.forEach(conn => sendMessage...) 하게 되면 같은 계정 n개 탭에서 접속한 경우 걔들은 메시지 n번씩 찍힘)
  const o = {}
  connections.forEach(conn => o[conn.user.token] = conn)
  Object.values(o).forEach((conn: IConnection) => sendMessage(message, conn.user.token))

  if (message.type === 'text') {
    sentMessages.push(asIMessage(message))
    sentMessages = sentMessages.slice(-latestMessagesLimit)
  }
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
      broadcast(o)
      return
    }
  })
}

const useChat = (app: FastifyInstance) => {
  app.get('/chat', { websocket: true }, onConnected)

  app.get('/messages/latest', (_, reply) => {
    useResponse(reply).asJSON(sentMessages)
  })
}

export default useChat