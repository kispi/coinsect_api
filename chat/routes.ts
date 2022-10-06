import { FastifyInstance } from 'fastify'
import { useRouter } from '../core/router'
import { chatCtrl, onConnected } from './controllers'
import fastifyWebsocket from '@fastify/websocket'
import middlewares from '../core/middlewares'

const useChatRoutes = (app: FastifyInstance) => {
  const routes = useRouter(app)
  app.register(fastifyWebsocket)
  app.register(async fastify => {
    fastify.get('/webchat', { websocket: true }, onConnected)
  })

  routes.get('/webchat/config', chatCtrl.config.get)
  routes.post('/webchat/config', chatCtrl.config.post)

  // 추후에는 채팅서버와 WebSocket을 연결해서 쭉 유지하면서 티키타카할까 생각중 (연결을 맺었다 끊었다 하면 비용이 크니)
  // 현재 남의 토큰도 클라에서 고스란히 노출중이기 때문에, 남의 계정 상태를 업데이트하는게 가능하다.
  routes.put('/webchat/users/:token', chatCtrl.user.update)
  routes.put('/webchat/user_settings/:token', chatCtrl.user.updateSetting)
  routes.delete('/webchat/users/:token', chatCtrl.user.delete)
  routes.get('/webchat/users', chatCtrl.user.all, middlewares.adminAuth.super)
  routes.get('/webchat/messages', chatCtrl.message.all)

  // API 서버에서 찌르는 API들 (인증 필요))
  routes.get('/webchat/users/:token', chatCtrl.user.one, chatCtrl.authApiServer)
  routes.delete('/webchat/users/old', chatCtrl.user.deleteOld, chatCtrl.authApiServer)
  routes.post('/webchat/messages/:id/hide', chatCtrl.message.hideMessage, chatCtrl.authApiServer)
  routes.post('/webchat/messages', chatCtrl.message.send, chatCtrl.authApiServer)
  routes.post('/webchat/messages/broadcast', chatCtrl.message.broadcast, chatCtrl.authApiServer)
  routes.post('/webchat/messages/invalidate', chatCtrl.message.invalidate, chatCtrl.authApiServer)
  routes.post('/webchat/push_notifications', chatCtrl.sendPushNotification, chatCtrl.authApiServer)
  routes.post('/webchat/ban_ip', chatCtrl.user.ban, chatCtrl.authApiServer)
}

export default useChatRoutes