import { Reaction } from '../entities/reaction'
import IContext from '../core/interfaces/context'
import helpers from '../core/helpers/'
import emojis from '../constants/emojis'

const reactionController = {
  toggle: {
    post: async (c: IContext) => {
      if (
        !c.req.ip ||
        !c.req.body['postId'] ||
        !['thumbs_up', 'thumbs_down'].includes(c.req.body['type'])
      ) return c.res.failed({ message: 'invalid request' })

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
    reply: async (c: IContext) => {
      if (
        !c.req.ip ||
        !c.req.body['replyId'] ||
        !['thumbs_up', 'thumbs_down'].includes(c.req.body['type'])
      ) return c.res.failed({ message: 'invalid request' })

      const user = await helpers.jwt.mustUser(c)
      try {
        const result = await c.orm.getRepository(Reaction).createQueryBuilder().where(`
          ip = '${c.req.ip}' AND
          type = '${c.req.body['type']}' AND
          reply_id = '${c.req.body['replyId']}'
        `).getOne()
        if (result) await c.orm.getRepository(Reaction).createQueryBuilder().where(`id = ${result.id}`).delete().execute()
        else await c.orm.getRepository(Reaction).insert({
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
    message: async (c: IContext) => {
      if (
        !c.req.ip ||
        !c.req.body['messageId'] ||
        !emojis.map(emoji => emoji.name).includes(c.req.body['type'])
      ) return c.res.failed({ message: 'invalid request' })

      const user = await helpers.jwt.mustUser(c)
      try {
        const result = await c.orm.getRepository(Reaction).createQueryBuilder().where(`
          ip = '${c.req.ip}' AND
          type = '${c.req.body['type']}' AND
          message_id = '${c.req.body['messageId']}'
        `).getOne()
        if (result) await c.orm.getRepository(Reaction).createQueryBuilder().where(`id = ${result.id}`).delete().execute()
        else await c.orm.getRepository(Reaction).insert({
          ip: c.req.ip,
          type: c.req.body['type'],
          message: { id: c.req.body['messageId'] },
          nickname: c.req.body['nickname'],
          user,
        })
        c.res.success()
      } catch (e) {
        c.res.failed(e)
      }
    },
  },
}

export default reactionController