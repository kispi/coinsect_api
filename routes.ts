import { FastifyInstance } from 'fastify'
import { useRouter } from './core/router'
import useControllers from './controllers'

export const useRoutes = (app: FastifyInstance) => ({
  admin: () => {
    const router = useRouter(app)
    const ctrls = useControllers()

    router.post('/admin/chat/banIP', ctrls.admin.chat.banIP)
    router.post('/admin/chat/sendMessage', ctrls.admin.chat.sendMessage)

    router.get('/admin/messages', ctrls.admin.message.all)
  },
  service: () => {
    const router = useRouter(app)
    const ctrls = useControllers()

    router.get('/config', ctrls.config.get)

    router.get('/users', ctrls.user.all)
    router.get('/users/:id', ctrls.user.detail)
    router.post('/users', ctrls.user.create)

    router.get('/posts', ctrls.post.all)
    router.get('/posts/:id', ctrls.post.detail)
    router.post('/posts', ctrls.post.create)
    router.put('/posts/:id', ctrls.post.update)
    router.delete('/posts/:id', ctrls.post.delete)

    router.post('/reactions', ctrls.reaction.create)
    router.delete('/reactions', ctrls.reaction.delete)

    router.get('/market_info/leaderboard', ctrls.marketInfo.leaderboard)
    router.get('/market_info/indices', ctrls.marketInfo.indices)
    router.get('/market_info/markets', ctrls.marketInfo.markets)
    router.get('/market_info/marketcaps', ctrls.marketInfo.caps)
  }
})

export default useRoutes