import { FastifyRequest } from 'fastify'
import { Connection } from 'typeorm';

interface IAppResponse {
  asJSON: (json: object) => void
  asHTML: (html: string) => void
  failed: (payload?: string | object, code?: number) => void
  success: (json?: object) => void
}

export default interface IContext {
  orm: Connection,
  req: FastifyRequest,
  res: IAppResponse,
}