import { FastifyReply, FastifyRequest } from 'fastify'
import helpers from './helpers'

export const createLogger = () => {
  return {
    info: (...args) => console.log(`[${helpers.dayjs().format()}]`, ...args),
    debug: (...args) => console.info(`[${helpers.dayjs().format()}]`, ...args),
    error: (...args) => console.error(`[${helpers.dayjs().format()}]`, ...args),
    warn: (...args) => console.warn(`[${helpers.dayjs().format()}]`, ...args),
  }
}

export const createHttpLog = (req: FastifyRequest, res: FastifyReply): {
  ts?: string,
  method?: string,
  url?: string,
  status?: number,
  ms?: number,
  ip?: string | string[],
  userAgent: string,
} => {
  const time = new Date().toISOString()
  const [a, b] = time.split('T')

  const log = {
    ts: `${a} ${b.substring(0, 8)}`,
    method: req.method,
    url: req.url,
    status: res.statusCode,
    ms: Math.round(100 * (helpers.now() - req['$$startTime'])) / 100,
    ip: req.headers['ssr-proxy-from'] || req.headers['x-forwarded-for'] ||  req.socket.remoteAddress, // ssr-proxy-from은 ssr 서버에서 그리로 들어오는 x-forwarded-for를 넘겨준 것.
    userAgent: req.headers['user-agent'],
  }

  if (req.headers['is-ssr']) log['is-ssr'] = true

  return log
}

export const log = createLogger()

export default {
  log,
  createLogger,
  createHttpLog,
}