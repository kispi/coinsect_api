import { FastifyInstance } from 'fastify'
import helpers from './helpers'
import store from './store'
import useChatRoutes from './routes'

export const useChat = async (app: FastifyInstance) => {
  // 레디스를 사용할 경우 중간에 레디스 pubsub을 끼고 브로드캐스팅을 진행하여 스케일링이 가능해진다. (인스턴스 한대만 쓸거면 없어도 됨)
  if (store.getters.config().server.USE_REDIS === 'yes') helpers.usePubsub()
  store.actions.loadRecentMessages()
  store.actions.loadUsers()
  useChatRoutes(app)
}

export default useChat