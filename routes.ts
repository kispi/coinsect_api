import { FastifyInstance } from 'fastify'
import { useRouter } from './core/router'
import helpers from './core/helpers'
import middlewares from './core/middlewares'
import useControllers from './controllers'

const ctrls = useControllers()

const auth = {
  admin: middlewares.adminAuth,
}

const useRouteCRUD = ({ app, model }) => {
  const router = useRouter(app)

  const sp = helpers.case.pluralize(helpers.case.toSnake(model))

  router.post(`/admin/${sp}`, ctrls.admin[model].create, auth.admin)
  router.get(`/admin/${sp}`, ctrls.admin[model].all, auth.admin)
  router.get(`/admin/${sp}/:id`, ctrls.admin[model].detail, auth.admin)
  router.put(`/admin/${sp}/:id`, ctrls.admin[model].update, auth.admin)
  router.delete(`/admin/${sp}/:id`, ctrls.admin[model].delete, auth.admin)
}

export const useRoutes = (app: FastifyInstance) => ({
  admin: () => {
    const router = useRouter(app)

    router.post('/admin/chat/ban_ip', ctrls.admin.chat.banIP, auth.admin)
    router.post('/admin/chat/send_message', ctrls.admin.chat.sendMessage, auth.admin)

    router.get('/admin/store/bad_words', ctrls.admin.store.badWord.all, auth.admin)
    router.get('/admin/store/banned_users', ctrls.admin.store.bannedUser.all, auth.admin)
    router.post('/admin/store/bad_words/invalidate', ctrls.admin.store.badWord.invalidate, auth.admin)
    router.post('/admin/store/banned_users/invalidate', ctrls.admin.store.bannedUser.invalidate, auth.admin)
    router.post('/admin/store/messages/invalidate', ctrls.admin.store.message.invalidate, auth.admin)

    router.post('/admin/contents/real_time_positions', ctrls.content.realTimePositions.set, auth.admin)
    router.delete('/admin/contents/real_time_positions/:id', ctrls.content.realTimePositions.delete, auth.admin)

    useRouteCRUD({ app, model: 'badWord' })
    useRouteCRUD({ app, model: 'bannedUser' })
    useRouteCRUD({ app, model: 'board' })
    useRouteCRUD({ app, model: 'image' })
    useRouteCRUD({ app, model: 'message' })
    useRouteCRUD({ app, model: 'notification' })
    useRouteCRUD({ app, model: 'person' })
    useRouteCRUD({ app, model: 'post' })
    useRouteCRUD({ app, model: 'reaction' })
    useRouteCRUD({ app, model: 'reply' })
  },
  service: () => {
    const router = useRouter(app)

    router.get('/config', ctrls.config.get)
    router.post('/config', ctrls.config.post)

    router.get('/users', ctrls.user.all)
    router.get('/users/:id', ctrls.user.detail)
    router.post('/users', ctrls.user.create)

    router.get('/persons', ctrls.person.all)

    router.get('/posts', ctrls.post.all)
    router.get('/posts/:sharingKey', ctrls.post.detail)
    router.post('/posts', ctrls.post.create)
    router.put('/posts/:sharingKey', ctrls.post.update)
    router.post('/posts/:sharingKey/check_password', ctrls.post.checkPassword)
    router.delete('/posts/:sharingKey', ctrls.post.delete)

    router.post('/replies', ctrls.reply.create)
    router.delete('/replies/:id', ctrls.reply.delete)
    router.post('/replies/:id/check_password', ctrls.reply.checkPassword)
    router.post('/reactions', ctrls.reaction.toggle)

    router.get('/market_info/leaderboard', ctrls.marketInfo.leaderboard)
    router.get('/market_info/indices', ctrls.marketInfo.indices)
    router.get('/market_info/symbols', ctrls.marketInfo.symbols)
    router.get('/market_info/markets', ctrls.marketInfo.markets)

    router.get('/contents/public_treasuries', ctrls.content.publicTreasuries)
    router.get('/contents/real_time_positions', ctrls.content.realTimePositions.all)

    router.get('/notifications', ctrls.notification.all)

    router.get('/s3/upload_url', ctrls.s3.getSignedUrl)
    router.delete('/s3/object', ctrls.s3.deleteObject)
  },
  seo: () => {
    const router = useRouter(app)

    router.get('/seo/posts', ctrls.seo.post.all)
    router.get('/seo/posts/:sharingKey', ctrls.seo.post.detail)

    router.get('/seo/persons', ctrls.seo.person.all)
    router.get('/seo/persons/:sharingKey', ctrls.seo.person.detail)
  },
})

export default useRoutes