import IContext from '../core/context'
import { exec } from 'child_process'

const deployController = {
  coinsect: {
    web: {
      deploying: false,
      status: (c: IContext) => {
        c.res.success({ deploying: deployController.coinsect.web.deploying })
      },
      request: (c: IContext) => new Promise((resolve, reject) => {
        deployController.coinsect.web.deploying = true
        exec('cd /home/ec2-user/web/coinsect_web && git pull && npm run build:ssr && pm2 restart coinsect_web', (err, stdout, stderr) => {
          if (err || stderr) {
            deployController.coinsect.web.deploying = false
            return reject(err || stderr)
          }

          deployController.coinsect.web.deploying = false
          resolve(stdout)
        })
      }),
    },
    api: {
      deploying: false,
      status: (c: IContext) => {
        c.res.success({ deploying: deployController.coinsect.api.deploying })
      },
      request: (c: IContext) => new Promise((resolve, reject) => {
        deployController.coinsect.api.deploying = true
        return exec('cd /home/ec2-user/web/coinsect_api && git pull && npm run build && pm2 restart coinsect_api', (err, stdout, stderr) => {
          if (err || stderr) {
            deployController.coinsect.api.deploying = false
            return reject(err || stderr)
          }

          deployController.coinsect.api.deploying = false
          resolve(stdout)
        })
      }),
    },
  },
}

export default deployController