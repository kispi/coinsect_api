import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getConnection } from 'typeorm'
import { log, createHttpLog } from './logger'
import useCache from './cache'
import useResponse from './response'

const createContext = (req: FastifyRequest, reply: FastifyReply) => ({
  orm: getConnection(),
  cache: useCache(),
  req,
  res: useResponse(reply),
})

const useMiddleware = async (
  req: FastifyRequest,
  res: FastifyReply,
  handler: Function,
  middleware?: Function,
) => {
  const c = createContext(req, res)

  const hl = () => JSON.stringify(createHttpLog(req, res))

  if (middleware) {
    try {
      await middleware(c)
    } catch (e) {
      c.res.failed(e, (e || {}).code)
      log.error(hl())
      return
    }
  }

  try {
    await handler(c)
  } catch (e) {
    // e.code가 있으면 서버개발자의 커스텀 에러이고, 없는 경우는 500으로 처리한다.
    if ((e || {}).code) c.res.failed(e, e.code)
    else c.res.error()
    log.error(hl())
    return
  }

  // 특별할 것 없는 매번 앱 새로고침될때마다 콜되는 API들 스킵함.
  const routesSkipLog = [
    '/config',
    '/messages',
    '/notifications',
    '/market_info/indices',
    '/market_info/symbols',
    '/market_info/markets',
  ]
  if (routesSkipLog.includes(req.routerPath)) return

  log.info(hl())
}

export const useRouter = (app: FastifyInstance) => ({
  get: (path: string, handler: Function, middleware?: Function) => {
    app.get(path, (req, res) => useMiddleware(req, res, handler, middleware))
  },
  post: (path: string, handler: Function, middleware?: Function) => {
    app.post(path, (req, res) => useMiddleware(req, res, handler, middleware))
  },
  put: (path: string, handler: Function, middleware?: Function) => {
    app.put(path, (req, res) => useMiddleware(req, res, handler, middleware))
  },
  delete: (path: string, handler: Function, middleware?: Function) => {
    app.delete(path, (req, res) => useMiddleware(req, res, handler, middleware))
  },
})

export default {
  useRouter,
}