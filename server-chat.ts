import { FastifyInstance } from 'fastify'

/**
 * message: {
 *   k,
 *   v: {
 *     u: { n },
 *     },
 *     x,
 *     l,
 *   },
 *   ts,
 * },
 * 
 * k: KEY
 * v: VALUE
 * u: USER
 * ts: TIMESTAMP
 * n: NICKNAME
 * x: TEXT
 * l: NO. OF CONNECTIONS
 */

const connections = {}

// req: 웹소켓이 연결된 클라이언트, secWebsocketKey: 메시지를 보낼 대상의 secWebsocketkey
const sendMessage = ({ message, req, secWebsocketKey }) => {
  const connectionWrapper = connections[secWebsocketKey]
  if (!message.v) message.v = {}

  message.v.u = { n: connections[req.headers['sec-websocket-key']].nickname }
  message.v.isMine = req.headers['sec-websocket-key'] === secWebsocketKey
  if (message.k === 'set_nickname') message.v.l = Object.keys(connections).length
  if (message.k === 'leave') message.v.l = Object.keys(connections).length - 1

  connectionWrapper.connection.socket.send(JSON.stringify(message))
}

// 메시지를 접속된 클라이언트들에게 뿌리고 서버 메모리에 저장한다. (나중에 redis pubsub으로 변경)
const broadcast = ({ message, req }) => {
  Object.keys(connections).forEach(secWebsocketKey => sendMessage({ message, req, secWebsocketKey }))
}

const useChat = (app: FastifyInstance) => {
  app.get('/chat', { websocket: true }, (connection, req) => {
    connections[req.headers['sec-websocket-key']] = {
      connection,
    }

    connection.socket.send(JSON.stringify({
      k: 'auth',
      v: {
        u: {
          t: req.headers['sec-websocket-key'],
        },
      },
    }))

    connection.socket.on('close', () => {
      broadcast({ message: { k: 'leave' }, req })
      delete connections[req.headers['sec-websocket-key']]
    })

    connection.socket.on('message', message => {
      const o = JSON.parse(message)
      o.ts = new Date()
      if (o.k === 'set_nickname') {
        connections[req.headers['sec-websocket-key']].nickname = (((o.v || {}) || {}).u || {}).n
        broadcast({ message: o, req })
        return
      }

      if (o.k === 'text') {
        broadcast({ message: o, req })
        return
      }
    })
  })
}

export default useChat