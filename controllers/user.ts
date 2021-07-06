import { FastifyRequest, FastifyReply } from 'fastify'
import useResponses from '../responses'

const detail = (request: FastifyRequest, reply: FastifyReply) => {
  useResponses(reply).asJSON({ name: 'Chanho', birthday: '1989-06-23' })
}

const all = (request: FastifyRequest, reply: FastifyReply) => {
  useResponses(reply).asHTML('<div style="color: red;">Not all too many users yet</div>')
}

export default {
  detail,
  all,
}