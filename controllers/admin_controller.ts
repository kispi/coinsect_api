import IContext from '../core/context'
import useService from '../services'
import { sendMessage } from '../chat/server-chat'
import { Message } from '../entities/message'
import { BadWord } from '../entities/bad_word'
import orm from '../core/orm'

const service = useService()

const useCRUD = model => ({
  all: async (c: IContext) => {
    try {
      const res = await orm.querySetter(c, model).getManyAndCount()
      c.res.asJSON({
        data: res[0],
        total: res[1],
      })
    } catch (e) {
      c.res.failed()
    }
  },
})

const chat = {
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

const adminController = {
  chat,
  badWord: useCRUD(BadWord),
  message: useCRUD(Message),
}

export default adminController