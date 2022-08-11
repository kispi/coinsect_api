import { FastifyInstance } from 'fastify'
import { useRouter } from '../core/router'
import { chatCtrl, onConnected } from './controller'
import store from './store'
import middlewares from '../core/middlewares'

export const useChat = (app: FastifyInstance) => {
  const routes = useRouter(app)
  store.actions.loadRecentMessages()
  store.actions.loadUsers()

  app.get('/webchat', { websocket: true }, onConnected)

  routes.get('/webchat/config', chatCtrl.config)

  // 추후에는 채팅서버와 WebSocket을 연결해서 쭉 유지하면서 티키타카할까 생각중 (연결을 맺었다 끊었다 하면 비용이 크니)
  routes.put('/webchat/users/:token', chatCtrl.users.update)
  routes.delete('/webchat/users/:token', chatCtrl.users.delete)
  routes.get('/webchat/users', chatCtrl.users.all, middlewares.adminAuth.super)
  routes.get('/webchat/messages', chatCtrl.messages.all)

  // API 서버에서 찌르는 API들 (인증 필요))
  routes.get('/webchat/users/:token', chatCtrl.users.one, chatCtrl.authApiServer)
  routes.delete('/webchat/users/old', chatCtrl.users.deleteOld, chatCtrl.authApiServer)
  routes.post('/webchat/messages', chatCtrl.messages.send, chatCtrl.authApiServer)
  routes.post('/webchat/messages/broadcast', chatCtrl.messages.broadcast, chatCtrl.authApiServer)
  routes.post('/webchat/messages/invalidate', chatCtrl.messages.invalidate, chatCtrl.authApiServer)
  routes.post('/webchat/ban_ip', chatCtrl.users.ban, chatCtrl.authApiServer)
}

export default useChat