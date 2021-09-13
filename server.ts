import fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import useRoutes from './routes'
import useDB from './database'
import axios from 'axios'
import fastifyWebsocket from 'fastify-websocket'
import { useChat } from './chat/server-chat'
import store from './store'

const initApp = async app => {
  app.register(fastifyCors)
  app.register(fastifyWebsocket)
  await useDB()

  const routeMaker = useRoutes(app)
  routeMaker.service()
  routeMaker.admin()
  routeMaker.seo()

  useChat(app)
  axios.interceptors.response.use(
    res => res.data,
    err => {
      if (!err.response) {
        throw err
      }
  
      throw err.response
    },
  )
}

const prettyPrint = {
  colorize: true,
  translateTime: true,
  ignore: 'pid,hostname,reqId,req.hostname,req.remotePort',
  singleLine: true,
  customPrettifiers: {
    responseTime: time => `${Math.round(time)}ms`,
  },
}

const app = fastify({
  logger: {
    prettyPrint,
  },
  trustProxy: true,
  ignoreTrailingSlash: true,
})

initApp(app).then(() => app.listen(store.state.serverConfig.API_PORT, '0.0.0.0'))