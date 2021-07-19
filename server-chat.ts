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

const broadcast = (message, req) => {
  Object.keys(connections).forEach(key => {
    const connectionWrapper = connections[key]
    if (!message.v) message.v = {}
    message.v.u = { n: connectionWrapper.nickname }
    message.v.isMine = req.headers['sec-websocket-key'] === key
    if (message.k === 'set_nickname') message.v.l = Object.keys(connections).length
    if (message.k === 'leave') message.v.l = Object.keys(connections).length - 1

    connectionWrapper.connection.socket.send(JSON.stringify(message))
  })
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
      broadcast({ k: 'leave' }, req)
      delete connections[req.headers['sec-websocket-key']]
    })

    connection.socket.on('message', message => {
      const o = JSON.parse(message)
      o.ts = new Date()
      if (o.k === 'set_nickname') {
        connections[req.headers['sec-websocket-key']].nickname = (((o.v || {}) || {}).u || {}).n
        broadcast(o, req)
        return
      }

      if (o.k === 'text') {
        broadcast(o, req)
        return
      }
    })
  })
}

export default useChat