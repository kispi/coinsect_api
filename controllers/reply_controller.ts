import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import helpers from '../core/helpers'
import { dataSource } from '../database'
import { Reply } from '../entities/reply'

const replyController = {
  create: async (c: IContext) => {
    if (!c.req.ip) return c.res.failed()

    const bannedUser = helpers.useBannedUser({ ip: c.req.ip })
    if (bannedUser) return c.res.failed({ message: 'BANNED_USER', extra: { bannedUser } })

    const payload = c.req.body
    if (!payload['post']['id']) return c.res.failed()

    try {
      await Reply.validate(payload)
    } catch (e) {
      return c.res.failed(e)
    }

    payload['ip'] = c.req.ip
    payload['content'] = helpers.sanitize.html(payload['content'])

    const user = await helpers.jwt.mustUser(c)
    if (user) payload['user'] = user
    else {
      payload['password'] = helpers.hashed(payload['password'])
      if (!payload['password']) return c.res.failed({ message: 'password is required' })
    }

    try {
      await orm.querySetter(c, Reply).insert().into(Reply).values(payload).execute()
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  delete: async (c: IContext) => {
    const user = await helpers.jwt.mustUser(c)
    if (!user && !c.req.body['password']) return c.res.failed()

    try {
      const replyRepository = dataSource.getRepository(Reply)
      const target = await replyRepository.findOneOrFail({ where: { id: c.req.params['id'] } })
      if (target.userId) {
        // 자기 자신의 댓글을 삭제하기 때문에 비밀번호가 필요 없는 경우
        if (user['id'] !== target.userId) return c.res.failed()
      } else {
        // 익명 댓글을 삭제하기 때문에 비밀번호가 필요한 경우
        if (!helpers.compare(target.password, c.req.body['password'])) return c.res.failed({ message: 'INCORRECT_PASSWORD' })
      }

      await replyRepository.softRemove(target)
      c.res.success()
    } catch (e) {
      c.res.failed()
    }
  },
  checkPassword: async (c: IContext) => {
    if (!c.req.body['password']) return c.res.failed({ message: 'invalid payload' })

    try {
      const target = await dataSource.getRepository(Reply).findOneOrFail({ where: { id: c.req.params['id'] } })
      if (!helpers.compare(target.password, c.req.body['password'])) {
        c.res.failed({ message: 'INCORRECT_PASSWORD' })
        return
      }
      c.res.success()
    } catch (e) {
      c.res.failed({ message: 'Reply not found' })
    }
  },
}

export default replyController