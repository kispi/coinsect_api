import { FastifyReply } from 'fastify'

const useResponse = (reply: FastifyReply) => {
  return {
    asJSON: (json: Object) => {
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(json)
    },
    asHTML: (html: string) => {
      reply
        .type('text/html')
        .send(html)
    },
    failed: (json?: Object, code?: number) => {
      reply
        .type('text/html')
        .code(code || 400)
        .send(json || { message: 'failed' })
    },
    success: (json?: Object) => {
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(json || { message: 'success' })
    },
  }
}

export default useResponse