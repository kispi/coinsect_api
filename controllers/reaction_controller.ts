import IContext from '../core/context'
import { Reaction } from '../entities/reaction'

const reactionController = {
  create: (c: IContext) => {
    c.orm.createQueryBuilder().insert().into(Reaction).values([{
      nickname: c.req.body['nickname'],
      ip: c.req.ip,
    }]).execute()
      .then(() => c.res.asHTML('success'))
      .catch(e => {
        c.res.failed(e.code)
      })
  },
  delete: (c: IContext) => {
    c.orm.getRepository(Reaction).delete(c.req.params['id'])
  },
}

export default reactionController