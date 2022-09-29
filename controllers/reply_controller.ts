import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import helpers from '../core/helpers'
import { dataSource } from '../database'
import { Reply } from '../entities/reply'

const replyController = {
  create: async (c: IContext) => {
    if (!c.req.ip) {
      c.res.failed()
      return
    }

    const bannedUser = helpers.useBannedUser({ ip: c.req.ip })
    if (bannedUser) return c.res.failed({ message: 'BANNED_USER', extra: { bannedUser } })

    const payload = c.req.body
    if (!payload['post']['id']) {
      c.res.failed()
      return
    }

    try {
      await Reply.validate(payload)
    } catch (e) {
      return c.res.failed(e)
    }

    payload['ip'] = c.req.ip
    payload['password'] = helpers.hashed(payload['password'])
    payload['content'] = helpers.sanitize.html(payload['content'])

    try {
      await orm.querySetter(c, Reply).insert().into(Reply).values(payload).execute()
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  delete: async (c: IContext) => {
    if (!c.req.body['password']) {
      c.res.failed()
    }

    try {
      const replyRepository = dataSource.getRepository(Reply)
      const target = await replyRepository.findOneOrFail(c.req.params['id'])
      if (!helpers.compare(target.password, c.req.body['password'])) {
        c.res.failed({ message: 'INCORRECT_PASSWORD' })
        return
      }

      await replyRepository.softRemove(target)
      c.res.success()
    } catch (e) {
      c.res.failed()
      return    
    }
  },
  checkPassword: async (c: IContext) => {
    if (!c.req.body['password']) return c.res.failed({ message: 'invalid payload' })

    try {
      const target = await dataSource.getRepository(Reply).findOneOrFail(c.req.params['id'])
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