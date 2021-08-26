import IContext from '../core/context'
import useService from '../services'
import { sendMessage } from '../chat/server-chat'
import { Message } from '../entities/message'
import { BadWord } from '../entities/bad_word'
import orm from '../core/orm'
import { Board } from '../entities/board'
import store from '../store'

const service = useService()

const useCRUD = model => ({
  all: (c: IContext) => {
      orm.querySetter(c, model).getManyAndCount()
        .then(res => c.res.asJSON({
          data: res[0],
          total: res[1],
        }))
        .catch(c.res.failed)
  },
  detail: (c: IContext) => {
    orm.querySetter(c, model).where(`id = ${c.req.params['id']}`).getOne()
      .then(c.res.asJSON)
      .catch(c.res.failed)
  },
  delete: (c: IContext) => {
    orm.querySetter(c, model).where(`id = ${c.req.params['id']}`).delete().execute()
      .then(() => c.res.success())
      .catch(c.res.failed)
  },
  create: (c: IContext) => {
    orm.querySetter(c, model).insert().into(model).values(c.req.body).execute()
      .then(() => c.res.success())
      .catch(c.res.failed)
  },
  update: (c: IContext) => {
    orm.querySetter(c, model).update(model).set(c.req.body).where(`id = ${c.req.params['id']}`).execute()
      .then(() => c.res.success())
      .catch(c.res.failed)
  },
})

const routesChat = {
  banIP: (c: IContext) => {
    if (!c.req.body['ip'] || !c.req.body['timeout']) {
      c.res.failed('missing params: ip, timeout')
      return
    }

    const until = service.chat.banIP(c.req.body['ip'], c.req.body['timeout'])
    c.res.asJSON({ data: until })
  },
  sendMessage: (c: IContext) => {
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

const routesStore = {
  badWord: {
    all: (c: IContext) => c.res.asJSON(store.state.badWords),
    invalidate: (c: IContext) => store.actions.loadBadWords().then(c.res.asJSON)
  },
  message: {
    invalidate: (c: IContext) => store.actions.loadRecentMessages().then(c.res.asJSON)
  },
}

const adminController = {
  chat: routesChat,
  store: routesStore,
  badWord: useCRUD(BadWord),
  board: useCRUD(Board),
  message: useCRUD(Message),
}

export default adminController