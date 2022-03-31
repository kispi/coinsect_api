import IContext from '../core/context'
import { exec } from 'child_process'

const defaultHandler = (c: IContext) => (err, stdout, stderr) => {
  if (err || stderr) {
    return c.res.failed(err || stderr)
  }

  c.res.success()
}

const deployController = {
  coinsect: {
    web: (c: IContext) => {
      exec('cd /home/ec2-user/web/coinsect_web && git pull && npm run build:ssr && pm2 restart coinsect_web', defaultHandler(c))
    },
    api: (c: IContext) => {
      exec('cd /home/ec2-user/web/coinsect_api && git pull && npm run build && pm2 restart coinsect_api', defaultHandler(c))
    },
  },
}

export default deployController