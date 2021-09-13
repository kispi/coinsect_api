import IContext from '../core/context'
import orm from '../core/orm'
import helpers from '../core/helpers'
import { useCRUD } from '../core/controller'
import { Reply } from '../entities/reply'
import { getRepository } from 'typeorm'

const defaultHandlers = useCRUD(Reply)

const ReplyController = {
  create: async (c: IContext) => {
    if (!c.req.ip) {
      c.res.failed()
      return
    }

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
    payload['password'] = helpers.hashedPassword(payload['password'])
    payload['content'] = helpers.sanitizeHtml(payload['content'], { allowedTags: ['img'] })

    try {
      await orm.querySetter(c, Reply).insert().into(Reply).values(payload).execute()
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  update: defaultHandlers.update,
  delete: async (c: IContext) => {
    if (!c.req.body['password']) {
      c.res.failed()
    }

    try {
      const replyRepository = getRepository(Reply)
      const target = await replyRepository.findOneOrFail(c.req.params['id'])
      if (target.password !== c.req.body['password']) {
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
      const target = await getRepository(Reply).findOneOrFail(c.req.params['id'])
      if (target.password !== c.req.body['password']) {
        c.res.failed({ message: 'INCORRECT_PASSWORD' })
        return
      }

      c.res.success()
    } catch (e) {
      c.res.failed({ message: 'Reply not found' })
    }
  },
}

export default ReplyController