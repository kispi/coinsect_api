import IContext from '../core/context'
import useService from '../services'

const service = useService()

const adminController = {
  banIP: async (c: IContext) => {
    if (!c.req.body['ip'] || !c.req.body['timeout']) {
      c.res.failed('missing params: ip, timeout')
      return
    }

    service.chat.banIP(c.req.body['ip'], c.req.body['timeout'])
    c.res.asHTML('success')
  },
}

export default adminController