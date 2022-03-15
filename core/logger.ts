import { FastifyReply, FastifyRequest } from 'fastify'
import helpers from './helpers'

export const createLogger = () => {
  return {
    info: (...args) => console.log(...args),
    debug: (...args) => console.log(...args),
    error: (...args) => console.log(...args),
    warn: (...args) => console.log(...args),
  }
}

export const createHttpLog = (req: FastifyRequest, res: FastifyReply) => {
  const time = new Date().toISOString()
  const [a, b] = time.split('T')
  return {
    ts: `${a} ${b.substring(0, 8)}`,
    method: req.method,
    url: req.url,
    status: res.statusCode,
    ms: Math.round(100 * (helpers.now() - req['$$startTime'])) / 100,
    ip: req.headers['x-forwarded-for'] ||  req.socket.remoteAddress,
  }
}

export const log = createLogger()

export default {
  log,
  createLogger,
  createHttpLog,
}