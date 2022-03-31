import IContext from '../core/context'
import { exec } from 'child_process'

const deployController = {
  coinsect: {
    web: (c: IContext) => new Promise((resolve, reject) => {
      exec('cd /home/ec2-user/web/coinsect_web && git pull && npm run build:ssr && pm2 restart coinsect_web', (err, stdout, stderr) => {
        if (err || stderr) return reject(err || stderr)

        resolve(stdout)
      })
    }),
    api: (c: IContext) => new Promise((resolve, reject) => {
      return exec('cd /home/ec2-user/web/coinsect_api && git pull && npm run build && pm2 restart coinsect_api', (err, stdout, stderr) => {
        if (err || stderr) return reject(err || stderr)

        resolve(stdout)
      })
    }),
  },
}

export default deployController