import admin from './admin_controller'
import config from './config_controller'
import marketInfo from './market_info_controller'
import post from './post_controller'
import reaction from './reaction_controller'
import user from './user_controller'
import seo from './seo_controller'
import IContext from '../core/context'
import { getRepository } from 'typeorm'
import { Post } from '../entities/post'
import { Reply } from '../entities/reply'

const useControllers = () => ({
  admin,
  config,
  marketInfo,
  post,
  reaction,
  user,
  seo,
  checkPassword: async (c: IContext) => {
    const body = {
      id: c.req.body['id'],
      type: c.req.body['type'],
      password: c.req.body['password'],
    }

    if (!body.id || !body.type || !body.password) return c.res.failed({ message: 'invalid payload' })

    if (!['post', 'reply'].includes(body.type)) return c.res.failed({ message: '`type` should be either `post` | `reply`' })

    try {
      const target = await getRepository(body.type === 'post' ? Post : Reply).findOneOrFail(body.id)
      if (target.password !== body.password) {
        c.res.failed({ message: 'INCORRECT_PASSWORD' })
        return
      }

      c.res.success()
    } catch (e) {
      c.res.failed({ message: `${body.type} not found` })
    }
  }
})

export default useControllers