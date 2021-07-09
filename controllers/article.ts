import IContext from '../core/context'
import { Article } from '../entities/article'

const articleController = {
  detail: (c: IContext) => {
    c.orm.getRepository(Article).findOne(c.req.params['id'])
      .then(c.res.asJSON)
  },
  all: (c: IContext) => {
    c.orm.getRepository(Article).find()
      .then(c.res.asJSON)
  },
  create: (c: IContext) => {
    c.orm.createQueryBuilder().insert().into(Article).values([{
      title: c.req.body['title'],
      content: c.req.body['content'],
      user: null,
      nickname: c.req.body['nickname'],
      ip: c.req.ip,
    }]).execute()
      .then(() => c.res.asHTML('success'))
      .catch(e => {
        c.res.failed(e.code)
      })
  },
  delete: (c: IContext) => {
    c.orm.getRepository(Article).softDelete(c.req.params['id'])
  },
}

export default articleController