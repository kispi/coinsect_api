import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getConnection } from 'typeorm'
import useResponse from './response'

export const createContext = (req: FastifyRequest, reply: FastifyReply) => {
  return {
    orm: getConnection(),
    req,
    res: useResponse(reply),
  }
}

export const useRouter = (app: FastifyInstance) => {
  return {
    get: (path: string, handler: Function) => {
      app.get(path, (req, res) => handler(createContext(req, res)))
    },
    post: (path: string, handler: Function) => {
      app.post(path, (req, res) => handler(createContext(req, res)))
    },
    put: (path: string, handler: Function) => {
      app.put(path, (req, res) => handler(createContext(req, res)))
    },
    delete: (path: string, handler: Function) => {
      app.delete(path, (req, res) => handler(createContext(req, res)))
    },
  }
}

export default {
  createContext,
  useRouter,
}