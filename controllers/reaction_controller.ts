import { Reaction, simplifiedReaction } from '../entities/reaction'
import IContext from '../core/interfaces/context'
import helpers from '../core/helpers/'
import emojis from '../constants/emojis'
import chatService from '../services/chat'

const afterReact = async (c: IContext) => {
  chatService.invalidate() // loadRecentMessages를 수행해서 변경된 리액션이 반영된 캐시로 갱신.

  try {
    const reactions = await c.orm.getRepository(Reaction).createQueryBuilder()
      .where('message_id = :messageId', { messageId: c.req.body['messageId'] })
      .getMany()

    chatService.updateReactions({
      messageId: c.req.body['messageId'],
      reactions: reactions.map(simplifiedReaction),
    })
  } catch (e) {
    return Promise.reject(e)
  }
}

const reactionController = {
  // user_id가 null이면 ip를 기준으로 중복방지를 하고, user_id가 있으면 user_id를 기준으로 중복방지를 한다.
  toggle: {
    post: async (c: IContext) => {
      if (
        !c.req.ip ||
        !c.req.body['postId'] ||
        !['thumbs_up', 'thumbs_down'].includes(c.req.body['type'])
      ) return c.res.failed({ message: 'invalid request' })

      const user = await helpers.jwt.mustUser(c)
      try {
        const qb = c.orm.getRepository(Reaction).createQueryBuilder()
          .where('type = :type', { type: c.req.body['type'] })
          .andWhere('post_id = :postId', { postId: c.req.body['postId'] })

        // user_id가 null이면 ip를 기준으로, user_id가 있으면 user_id를 기준으로 중복방지.
        if (user) qb.andWhere('user_id = :userId', { userId: user['id'] })
        else qb.andWhere('ip = :ip', { ip: c.req.ip })

        const result = await qb.getOne()
        if (result) {
          await c.orm.getRepository(Reaction).createQueryBuilder()
            .where('id = :id', { id: result.id }).delete().execute()
        } else await c.orm.getRepository(Reaction).insert({
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
        const qb = c.orm.getRepository(Reaction).createQueryBuilder()
          .where('type = :type', { type: c.req.body['type'] })
          .andWhere('reply_id = :replyId', { replyId: c.req.body['replyId'] })

        // user_id가 null이면 ip를 기준으로, user_id가 있으면 user_id를 기준으로 중복방지.
        if (user) qb.andWhere('user_id = :userId', { userId: user['id'] })
        else qb.andWhere('ip = :ip', { ip: c.req.ip })

        const result = await qb.getOne()
        if (result) {
          await c.orm.getRepository(Reaction).createQueryBuilder()
            .where('id = :id', { id: result.id }).delete().execute()
        } else await c.orm.getRepository(Reaction).insert({
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
        !emojis[c.req.body['type']]
      ) return c.res.failed({ message: 'invalid request' })

      const user = await helpers.jwt.mustUser(c)
      try {
        const qb = c.orm.getRepository(Reaction).createQueryBuilder()
          .where('type = :type', { type: c.req.body['type'] })
          .andWhere('message_id = :messageId', { messageId: c.req.body['messageId'] })

        // user_id가 null이면 ip를 기준으로, user_id가 있으면 user_id를 기준으로 중복방지.
        if (user) qb.andWhere('user_id = :userId', { userId: user['id'] })
        else qb.andWhere('ip = :ip', { ip: c.req.ip })

        const result = await qb.getOne()
        if (result) {
          await c.orm.getRepository(Reaction).createQueryBuilder()
            .where('id = :id', { id: result.id }).delete().execute()
        } else await c.orm.getRepository(Reaction).insert({
          ip: c.req.ip,
          type: c.req.body['type'],
          message: { id: c.req.body['messageId'] },
          nickname: c.req.body['nickname'],
          user,
        })

        afterReact(c) // 후처리. 성공하든 실패하든 상관 없음.
        c.res.success()
      } catch (e) {
        c.res.failed(e)
      }
    },
  },
}

export default reactionController