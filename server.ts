import { app, initApp, backendGitHash } from './server_modules'
import { log } from './core/logger'
import store from './store'
import useService from './services'

const service = useService()

const run = async () => {
  process.on('unhandledRejection', err => {
    log.error('unhandled rejection:', err)
  })

  process.on('uncaughtException', err => {
    log.error('uncaught exception:', err)
  })

  await initApp(app)
  store.state.globalVariables.version.backend = await backendGitHash()
  app.listen({
    port: parseInt(store.state.serverConfig.API_PORT) || 4000,
    host: '0.0.0.0',
  })
  log.info(`
Server starts on port: ${store.state.serverConfig.API_PORT}
Cache: ${store.state.serverConfig.USE_REDIS === 'yes' ? 'Redis' : 'Javascript Instance'}
  `)

  if (process.env.RUN_CRON === 'yes') service.cron.run()

  setTimeout(() => {
    service.chat.deleteOldUsers(48)
  }, 2000)
}

run()