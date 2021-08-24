import fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import useRoutes from './routes'
import { useChat } from './chat/server-chat'
import useDotenv from './dotenv'
import useDB from './database'
import axios from 'axios'
import fastifyWebsocket from 'fastify-websocket'

const initApp = async app => {
  app.register(fastifyCors)
  app.register(fastifyWebsocket)
  await useDB()
  useRoutes(app)
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

const config = useDotenv()

const app = fastify({
  logger: true,
  trustProxy: true,
})

initApp(app).then(() => {
  app.listen(config.API_PORT, '0.0.0.0')
})