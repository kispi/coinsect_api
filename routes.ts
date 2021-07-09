import {FastifyInstance} from 'fastify'
import useControllers from './controllers'
import useRouter from './core/router'

const useRoutes = (app: FastifyInstance) => {
  const router = useRouter(app)
  const ctrls = useControllers()

  router.get('/users', ctrls.user.all)
  router.get('/users/:id', ctrls.user.detail)
  router.post('/users', ctrls.user.create)

  router.get('/articles', ctrls.article.all)
}

export default useRoutes