import { FastifyReply } from 'fastify'

const useResponses = (reply: FastifyReply) => {
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
  }
}

export default useResponses