import store from './store'
import { app, initApp, backendGitHash } from './server_modules'

const run = async () => {
  await initApp(app)
  store.state.globalVariables.version.backend = await backendGitHash()
  app.listen(store.state.serverConfig.API_PORT, '0.0.0.0')
}

run()