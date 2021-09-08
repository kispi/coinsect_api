import IContext from '../core/context'
import { Reaction } from '../entities/reaction'

const reactionController = {
  toggle: async (c: IContext) => {
    try {
      const result = await c.orm.getRepository(Reaction).createQueryBuilder().where(`ip = '${c.req.ip}' AND type = '${c.req.body['type']}'`).getOne()
      if (result) await c.orm.getRepository(Reaction).createQueryBuilder().where(`id = ${result.id}`).delete().execute()
      else await c.orm.getRepository(Reaction).insert({
        ip: c.req.ip,
        type: c.req.body['type'],
        post: { id: c.req.body['postId'] },
      })
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default reactionController