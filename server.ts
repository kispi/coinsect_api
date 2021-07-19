import fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import useRoutes from './routes'
import useChat from './server-chat'
import useDotenv from './dotenv'
import useDB from './database'
import axios from 'axios'
import fastifyWebsocket from 'fastify-websocket'

const initApp = app => {
  app.register(fastifyCors)
  app.register(fastifyWebsocket)
  useRoutes(app)
  useChat(app)
  useDB()
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

const app = fastify({ logger: true })
initApp(app)
app.listen(config.API_PORT, '0.0.0.0')