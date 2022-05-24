import { FastifyRequest } from 'fastify'
import { Connection } from 'typeorm'
import ICacheClient from './cache_client'

interface IAppResponse {
  asJSON: (json: unknown) => void
  asHTML: (html: string) => void
  failed: (payload?: string | unknown, code?: number) => void
  error: () => void,
  success: (json?: unknown) => void
}

export default interface IContext {
  orm: Connection,
  cache: ICacheClient,
  req: FastifyRequest,
  res: IAppResponse,
  validate: {
    requiredFields: (fields: string[]) => boolean,
  },
}