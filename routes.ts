import { FastifyInstance } from 'fastify'
import { useRouter } from './core/router'
import helpers from './core/helpers'
import useControllers from './controllers'

const ctrls = useControllers()

const useRouteCRUD = ({ app, model }) => {
  const router = useRouter(app)

  router.post(`/admin/${helpers.case.pluralize(model)}`, ctrls.admin[model].create)
  router.get(`/admin/${helpers.case.pluralize(model)}`, ctrls.admin[model].all)
  router.get(`/admin/${helpers.case.pluralize(model)}/:id`, ctrls.admin[model].detail)
  router.put(`/admin/${helpers.case.pluralize(model)}/:id`, ctrls.admin[model].update)
  router.delete(`/admin/${helpers.case.pluralize(model)}/:id`, ctrls.admin[model].delete)
}

export const useRoutes = (app: FastifyInstance) => ({
  admin: () => {
    const router = useRouter(app)

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
    useRouteCRUD({ app, model: 'reply' })
  },
  service: () => {
    const router = useRouter(app)

    router.get('/config', ctrls.config.get)

    router.get('/users', ctrls.user.all)
    router.get('/users/:id', ctrls.user.detail)
    router.post('/users', ctrls.user.create)

    router.get('/posts', ctrls.post.all)
    router.get('/posts/:id', ctrls.post.detail)
    router.post('/posts', ctrls.post.create)
    router.put('/posts/:id', ctrls.post.update)
    router.post('/posts/:id/check_password', ctrls.post.checkPassword)
    router.delete('/posts/:id', ctrls.post.delete)

    router.post('/replies', ctrls.reply.create)
    router.delete('/replies/:id', ctrls.reply.delete)
    router.post('/replies/:id/check_password', ctrls.reply.checkPassword)
    router.post('/reactions', ctrls.reaction.toggle)

    router.get('/market_info/leaderboard', ctrls.marketInfo.leaderboard)
    router.get('/market_info/indices', ctrls.marketInfo.indices)
    router.get('/market_info/markets', ctrls.marketInfo.markets)
    router.get('/market_info/marketcaps', ctrls.marketInfo.caps)

    router.get('/s3/upload_url', ctrls.s3.uploadUrl)
  },
  seo: () => {
    const router = useRouter(app)

    router.get('/seo/posts', ctrls.seo.post.all)
    router.get('/seo/posts/:id', ctrls.seo.post.detail)
  },
})

export default useRoutes