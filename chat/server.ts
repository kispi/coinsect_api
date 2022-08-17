import { FastifyInstance } from 'fastify'
import store from './store'
import useChatRoutes from './routes'

export const useChat = (app: FastifyInstance) => {
  store.actions.loadRecentMessages()
  store.actions.loadUsers()
  useChatRoutes(app)
}

export default useChat