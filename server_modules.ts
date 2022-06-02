import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fastifyCors from '@fastify/cors'
import useRoutes from './routes'
import useDB from './database'
import axios from 'axios'
import fastifyWebsocket from 'fastify-websocket'
import store from './store'
import helpers from './core/helpers'
import useChat from './chat/server'
import { log, createHttpLog } from './core/logger'
import marketInfoService from './services/market_info'

axios.defaults.timeout = 1000 * 30

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
    'COINSECT_CHAT',
  ]

  const c = store.state.serverConfig
  requiredFields.forEach(field => {
    if (!c[field]) {
      log.error(`[.env] missing required field: ${field}`)
      process.exit()
    }
  })

  if (!c['LAMBDA_COINNESS']) {
    log.warn(`[.env] missing field LAMBDA_COINNESS: Coinness News API won't work`)
  }

  if (!c['SLACK_COINSECT_API']) {
    log.warn(`[.env] missing field SLACK_COINSECT_API: Slackbot posting won't work`)
  }
}

const o = {}
const handleNotFound = (req: FastifyRequest, res: FastifyReply) => {
  res.status(404)

  const k = `${req.url}:${req.ip}`
  if (o[k]) o[k]++
  else o[k] = 1

  // 같은 IP가 존재하지 않는 같은 url로 100번 때릴때마다 한번씩 로그를 찍음
  if (o[k] % 100 === 0) {
    const l = createHttpLog(req, res)
    l['missingCount'] = o[k]
    log.error(JSON.stringify(l))
  }

  res.send({ message: 'Not Found' })
}

export const initApp = async (app: FastifyInstance) => {
  checkServerConfig()

  app.register(fastifyCors, {
    origin: (o, cb) => {
      const hostname = new URL(o).hostname
      if (hostname === 'localhost' || hostname === 'https://coinsect.io') {
        cb(null, true)
        return
      }

      cb(new Error('Not Allowed'), false)
    },
  })
  app.register(fastifyWebsocket)
  app.addHook('onRequest', (req, res, next) => {
    req['$$startTime'] = helpers.now()
    next()
  })
  await useDB()

  app.setNotFoundHandler(handleNotFound)
  const routeMaker = useRoutes(app)
  routeMaker.admin()
  routeMaker.deploy()
  routeMaker.service()

  Promise.all([
    store.actions.loadBadWords(),
    store.actions.loadBannedUsers(),
    marketInfoService.symbols(),
  ])

  // 나중에 따로 떼서 걔는 얘만 실행하는것도 가능
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