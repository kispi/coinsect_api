import { FastifyInstance } from 'fastify'
import { useRouter } from './core/router'
import useControllers from './controllers'

const useRouteCRUD = ({ app, model }) => {
  const router = useRouter(app)
  const ctrls = useControllers()

  router.post(`/admin/${model}s`, ctrls.admin[model].create)
  router.get(`/admin/${model}s`, ctrls.admin[model].all)
  router.get(`/admin/${model}s/:id`, ctrls.admin[model].detail)
  router.put(`/admin/${model}s/:id`, ctrls.admin[model].update)
  router.delete(`/admin/${model}s/:id`, ctrls.admin[model].delete)
}

export const useRoutes = (app: FastifyInstance) => ({
  admin: () => {
    const router = useRouter(app)
    const ctrls = useControllers()

    router.post('/admin/chat/banIP', ctrls.admin.chat.banIP)
    router.post('/admin/chat/sendMessage', ctrls.admin.chat.sendMessage)

    router.get('/admin/store/badWords', ctrls.admin.store.badWord.all)
    router.post('/admin/store/badWords/invalidate', ctrls.admin.store.badWord.invalidate)

    router.post('/admin/store/messages/invalidate', ctrls.admin.store.message.invalidate)

    useRouteCRUD({ app, model: 'message' })
    useRouteCRUD({ app, model: 'badWord' })
    useRouteCRUD({ app, model: 'board' })
    useRouteCRUD({ app, model: 'post' })
    useRouteCRUD({ app, model: 'reaction' })
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