import { RedisClientType } from '@node-redis/client';
import { FastifyRequest } from 'fastify'
import { Connection } from 'typeorm';

interface IAppResponse {
  asJSON: (json: unknown) => void
  asHTML: (html: string) => void
  failed: (payload?: string | unknown, code?: number) => void
  success: (json?: unknown) => void
}

export default interface IContext {
  orm: Connection,
  cache: RedisClientType,
  req: FastifyRequest,
  res: IAppResponse,
}