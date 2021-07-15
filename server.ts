import fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import useRoutes from './routes'
import useDotenv from './dotenv'
import useDB from './database'
import axios from 'axios'

const initApp = app => {
  app.register(fastifyCors)
  useRoutes(app)
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