import { FastifyInstance } from 'fastify'
import useControllers from './controllers'
import { useRouter } from './core/router'

const useRoutes = (app: FastifyInstance) => {
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

  router.get('/market_info/indices', ctrls.marketInfo.indices)
  router.get('/market_info/marketcaps', ctrls.marketInfo.caps)
}

export default useRoutes