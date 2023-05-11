import IContext from '../core/interfaces/context'
import helpers from '../core/helpers/'
import { Reaction } from '../entities/reaction'

const reactionController = {
  toggle: async (c: IContext) => {
    if (
      !c.req.ip ||
      !['up', 'down'].includes(c.req.body['type']) ||
      (c.req.body['postId'] && c.req.body['replyId']) ||
      (!c.req.body['postId'] && !c.req.body['replyId'])
    ) return c.res.failed({ message: 'invalid request' })

    const user = await helpers.jwt.mustUser(c)
    try {
      const result = await c.orm.getRepository(Reaction).createQueryBuilder().where(`
        ip = '${c.req.ip}' AND
        type = '${c.req.body['type']}' AND
        ${c.req.body['postId'] ? `post_id = '${c.req.body['postId']}'` : `reply_id = '${c.req.body['replyId']}'`}
      `).getOne()
      if (result) await c.orm.getRepository(Reaction).createQueryBuilder().where(`id = ${result.id}`).delete().execute()
      else await c.orm.getRepository(Reaction).insert(c.req.body['postId'] ? {
        ip: c.req.ip,
        type: c.req.body['type'],
        post: { id: c.req.body['postId'] },
        nickname: c.req.body['nickname'],
        user,
      } : {
        ip: c.req.ip,
        type: c.req.body['type'],
        reply: { id: c.req.body['replyId'] },
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