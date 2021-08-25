import { FastifyRequest } from 'fastify'
import { Connection } from 'typeorm';

interface IAppResponse {
  asJSON: (json: Object) => void
  asHTML: (html: string) => void
  failed: (message?: string) => void
}

export default interface IContext {
  orm: Connection,
  req: FastifyRequest,
  res: IAppResponse,
}