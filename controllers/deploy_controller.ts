import IContext from '../core/interfaces/context'
import { exec } from 'child_process'

type Repo = {
  key: string,
  deploying: boolean,
  lastDeployLog: string | Error,
  command: string,
}

const repos: Array<Repo> = [{
  key: 'coinsect_frontend',
  deploying: false,
  lastDeployLog: null,
  command: 'cd /home/ec2-user/web/coinsect_frontend && ./deploy.sh',
}, {
  key: 'coinsect_api',
  deploying: false,
  lastDeployLog: null,
  command: 'cd /home/ec2-user/web/coinsect_api && ./deploy.sh',
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