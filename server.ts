import store from './store'
import cronService from './services/cron'
import chatService from './services/chat'
import { app, initApp, backendGitHash } from './server_modules'
import { log } from './core/logger'

const run = async () => {
  await initApp(app)
  store.state.globalVariables.version.backend = await backendGitHash()
  app.listen(store.state.serverConfig.API_PORT, '0.0.0.0')
  log.info(`
Server starts on port: ${store.state.serverConfig.API_PORT}
Cache: ${store.state.serverConfig.USE_REDIS === 'yes' ? 'Redis' : 'Javascript Instance'}
  `)

  if (process.env.NODE_ENV === 'production') cronService.run()

  chatService.deleteOldUsers(3)
}

run()