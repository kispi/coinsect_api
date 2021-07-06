import {FastifyInstance} from 'fastify'
import useControllers from './controllers'

const useRoutes = (app: FastifyInstance) => {
  app.get('/users', useControllers().user.all)
  app.get('/users/:id', useControllers().user.detail)
}

export default useRoutes