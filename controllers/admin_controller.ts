import IContext from '../core/context'
import useService from '../services'
import { sendMessage } from '../chat/server-chat'

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
  sendMessage: async (c: IContext) => {
    sendMessage({
      message: {
        type: 'admin',
        text: c.req.body['text'],
      },
      token: c.req.body['token'],
      ip: c.req.body['ip'],
    })
  },
}

export default adminController