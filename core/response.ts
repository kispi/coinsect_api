import { FastifyReply } from 'fastify'

const useResponse = (reply: FastifyReply) => {
  return {
    asJSON: o => {
      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(o)
    },
    asHTML: (html: string) => {
      reply
        .type('text/html')
        .send(html)
    },
    failed: (message: string) => {
      reply
        .type('text/html')
        .code(400)
        .send(message)
    },
  }
}

export default useResponse