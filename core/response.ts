import { FastifyReply } from 'fastify'

const useResponse = (reply: FastifyReply) => {
  return {
    asJSON: (json: unknown) => {
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(json)
    },
    asHTML: (html: string) => {
      reply
        .type('text/html')
        .send(html)
    },
    failed: (payload?: string | unknown, code?: number) => {
      if (typeof payload === 'string') reply.type('text/html')
      if (typeof payload === 'object') reply.header('Content-Type', 'application/json; charset=utf-8')

      reply
        .code(code || 400)
        .send(payload || { message: 'failed' })
    },
    success: (json?: unknown) => {
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(json || { message: 'success' })
    },
  }
}

export default useResponse