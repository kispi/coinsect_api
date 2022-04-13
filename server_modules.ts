import fastify, { FastifyInstance } from 'fastify'
import fastifyCors from 'fastify-cors'
import useRoutes from './routes'
import useDB from './database'
import axios from 'axios'
import fastifyWebsocket from 'fastify-websocket'
import store from './store'
import helpers from './core/helpers'
import { useChat } from './chat/server_chat'
import { log, createHttpLog } from './core/logger'

axios.defaults.timeout = 5000

axios.interceptors.response.use(
  res => res.data,
  err => {
    if (!err.response) {
      throw err
    }

    throw err.response
  },
)

const checkServerConfig = () => {
  const requiredFields = [
    'API_PORT',
    'JWT_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'USE_REDIS',
  ]

  requiredFields.forEach(field => {
    if (!store.state.serverConfig[field]) {
      console.error(`[.env] missing required field: ${field}`)
      process.exit()
    }
  })
}

export const initApp = async (app: FastifyInstance) => {
  checkServerConfig()

  app.register(fastifyCors)
  app.register(fastifyWebsocket)
  app.addHook('onRequest', (req, res, next) => {
    req['$$startTime'] = helpers.now()
    next()
  })
  await useDB()

  app.setNotFoundHandler((req, res) => {
    res.status(404)
    log.error(JSON.stringify(createHttpLog(req, res)))
    res.send({ message: 'Not Found' })
  })
  const routeMaker = useRoutes(app)
  routeMaker.admin()
  routeMaker.deploy()
  routeMaker.service()

  await store.initCaches()
  useChat(app)
}

export const app = fastify({
  trustProxy: true,
  ignoreTrailingSlash: true,
})

export const backendGitHash = () => new Promise((resolve, reject) => {
  const exec = require('child_process').exec
  exec('git rev-parse --short HEAD', (err, stdout) => {
    if (stdout) return resolve(stdout.trim())
    if (err) return reject(err)
  })
})