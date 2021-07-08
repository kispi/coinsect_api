import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getConnection } from 'typeorm'
import useResponse from './response'

const createContext = (req: FastifyRequest, reply: FastifyReply) => {
  return {
    orm: getConnection(),
    req,
    res: useResponse(reply),
  }
}

const useRouter = (app: FastifyInstance) => {
  return {
    get: (path: string, handler: Function) => {
      app.get(path, (req, res) => handler(createContext(req, res)))
    },
    post: (path: string, handler: Function) => {
      app.post(path, (req, res) => handler(createContext(req, res)))
    },
  }
}

export default useRouter