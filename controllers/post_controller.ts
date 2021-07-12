import IContext from '../core/context'
import { Post } from '../entities/post'

const postController = {
  detail: (c: IContext) => {
    c.orm.getRepository(Post).findOne(c.req.params['id'])
      .then(c.res.asJSON)
  },
  all: (c: IContext) => {
    c.orm.getRepository(Post).find()
      .then(c.res.asJSON)
  },
  create: (c: IContext) => {
    c.orm.createQueryBuilder().insert().into(Post).values([{
      title: c.req.body['title'],
      content: c.req.body['content'],
      nickname: c.req.body['nickname'],
      postType: c.req.body['postType'],
      ip: c.req.ip,
    }]).execute()
      .then(() => c.res.asHTML('success'))
      .catch(e => {
        c.res.failed(e.code)
      })
  },
  update: (c: IContext) => {
    c.orm.createQueryBuilder().update(Post).set({
      title: c.req.body['title'],
      content: c.req.body['content'],
      nickname: c.req.body['nickname'],
      ip: c.req.ip,
    }).execute()
      .then(() => c.res.asHTML('success'))
      .catch(e => {
        c.res.failed(e.code)
      })
  },
  delete: (c: IContext) => {
    c.orm.getRepository(Post).softDelete(c.req.params['id'])
  },
}

export default postController