import IContext from '../core/interfaces/context'
import { exec } from 'child_process'

type Repo = {
  key: string,
  description: string,
  deploying: boolean,
  lastDeployLog: string | Error,
  command: string,
}

const repos: Array<Repo> = [{
  key: 'coinsect_frontend',
  description: 'coinsect.io',
  deploying: false,
  lastDeployLog: null,
  command: 'cd ~/web/coinsect_frontend && ./deploy.sh',
}, {
  key: 'coinsect_web',
  description: 'btc.coinsect.io',
  deploying: false,
  lastDeployLog: null,
  command: 'cd ~/web/coinsect_web && ./deploy.sh',
}, {
  key: 'coinsect_api',
  description: 'api.coinsect.io',
  deploying: false,
  lastDeployLog: null,
  command: 'cd ~/web/coinsect_api && ./deploy.sh',
}]

const deployController = {}

repos.forEach((repo, i) => {
  deployController[repo.key] = {
    status: (c: IContext) => {
      c.res.success({
        deploying: repo.deploying,
        lastDeployLog: repo.lastDeployLog,
      })
    },
    request: (c: IContext) => {
      repos[i].deploying = true
      exec(repo.command, (err, stdout, stderr) => {
        if (err || stderr) {
          repos[i].deploying = false
          repos[i].lastDeployLog = err || stderr
          return
        }
      
        repos[i].deploying = false
        repos[i].lastDeployLog = stdout
      })
      c.res.success()
    },
  }
})

export default deployController