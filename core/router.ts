import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getConnection } from 'typeorm'
import useResponse from './response'

const createContext = (req: FastifyRequest, reply: FastifyReply) => ({
  orm: getConnection(),
  req,
  res: useResponse(reply),
})

const useMiddleware = (req, res, handler: Function, middleware?: Function) => {
  const c = createContext(req, res)
  if (middleware) {
    try {
      middleware(c)
    } catch (e) {
      c.res.failed(e)
      return
    }
  }
  handler(c)
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