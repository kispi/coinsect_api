import IContext from '../core/interfaces/context'
import helpers from '../core/helpers/'
import { Reaction } from '../entities/reaction'

const reactionController = {
  toggle: async (c: IContext) => {
    const user = await helpers.jwt.mustUser(c)
    try {
      const result = await c.orm.getRepository(Reaction).createQueryBuilder().where(`
        ip = '${c.req.ip}' AND
        type = '${c.req.body['type']}' AND
        post_id = '${c.req.body['postId']}'
      `).getOne()
      if (result) await c.orm.getRepository(Reaction).createQueryBuilder().where(`id = ${result.id}`).delete().execute()
      else await c.orm.getRepository(Reaction).insert({
        ip: c.req.ip,
        type: c.req.body['type'],
        post: { id: c.req.body['postId'] },
        nickname: c.req.body['nickname'],
        user,
      })
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default reactionController