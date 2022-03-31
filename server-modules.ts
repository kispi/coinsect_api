import fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import useRoutes from './routes'
import useDB from './database'
import axios from 'axios'
import fastifyWebsocket from 'fastify-websocket'
import store from './store'
import helpers from './core/helpers'
import { useChat } from './chat/server-chat'

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

export const initApp = async app => {
  app.register(fastifyCors)
  app.register(fastifyWebsocket)
  app.addHook('onRequest', (req, res, next) => {
    req.$$startTime = helpers.now()
    next()
  })
  await useDB()

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