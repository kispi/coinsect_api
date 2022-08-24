import { FastifyInstance } from 'fastify'
import { log } from '../core/logger'
import helpers from './helpers'
import store from './store'
import useChatRoutes from './routes'

export const useChat = async (app: FastifyInstance) => {
  useChatRoutes(app)
  try {
    const promises = [
      store.actions.loadRecentMessages(),
      store.actions.loadUsers(),
    ]
    // 레디스를 사용할 경우 중간에 레디스 pubsub을 끼고 브로드캐스팅을 진행하여 스케일링이 가능해진다. (인스턴스 한대만 쓸거면 없어도 됨)
    if (store.getters.config().server.USE_REDIS === 'yes') promises.push(helpers.usePubsub())
    await Promise.all(promises)
  } catch (e) {
    log.error('useChat: failed to run chat server')
    Promise.reject(e)
  }
}

export default useChat