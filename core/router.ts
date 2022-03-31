import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getConnection } from 'typeorm'
import { log, createHttpLog } from './logger'
import useResponse from './response'

const createContext = (req: FastifyRequest, reply: FastifyReply) => ({
  orm: getConnection(),
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
      middleware(c)
    } catch (e) {
      console.error('Error:', e)
      c.res.error()
      log.error(hl())
      return
    }
  }

  try {
    await handler(c)
  } catch (e) {
    console.error('Error:', e)
    c.res.error()
    log.error(hl())
    return
  }

  const routesSkipLog = ['/config']
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