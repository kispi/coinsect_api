import store from './store'
import cronService from './services/cron'
import chatService from './services/chat'
import { app, initApp, backendGitHash } from './server_modules'
import { log } from './core/logger'

const run = async () => {
  process.on('unhandledRejection', (reason, promise) => {
    log.error('unhandled rejection:', reason)
  })

  await initApp(app)
  store.state.globalVariables.version.backend = await backendGitHash()
  app.listen({
    port: parseInt(store.state.serverConfig.API_PORT) || 4000,
  })
  log.info(`
Server starts on port: ${store.state.serverConfig.API_PORT}
Cache: ${store.state.serverConfig.USE_REDIS === 'yes' ? 'Redis' : 'Javascript Instance'}
  `)

  if (process.env.RUN_CRON === 'yes') cronService.run()

  setTimeout(() => {
    chatService.deleteOldUsers(48)
  }, 2000)
}

run()