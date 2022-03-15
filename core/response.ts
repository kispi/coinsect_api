import { FastifyReply } from 'fastify'

const useResponse = (reply: FastifyReply) => {
  const responses = {
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
    error: () => responses.failed({ message: 'Internal Server Error' }, 500),
    success: (json?: unknown) => {
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(json || { message: 'success' })
    },
  }

  return responses
}

export default useResponse