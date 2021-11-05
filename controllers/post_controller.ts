import { getRepository } from 'typeorm'
import { loadChildren } from '../core/controller'
import { Post } from '../entities/post'
import { Reply } from '../entities/reply'
import { Reaction } from '../entities/reaction'
import IContext from '../core/context'
import orm from '../core/orm'
import helpers from '../core/helpers'
import useService from '../services'

// 자유게시판 id
const freeBoardId = 1

const services = useService()

const postController = {
  create: async (c: IContext) => {
    if (!c.req.ip) {
      c.res.failed()
      return
    }

    const bannedUser = await helpers.useBannedUser(c.req.ip)
    if (bannedUser) return c.res.failed({ message: 'BANNED_USER', extra: { bannedUser } })

    const payload = c.req.body
    payload['board'] = { id : freeBoardId }

    try {
      await Post.validate(payload)
    } catch (e) {
      return c.res.failed(e)
    }

    payload['ip'] = c.req.ip
    payload['password'] = helpers.hashed(payload['password'])
    payload['title'] = helpers.sanitize.strict(payload['title'])
    payload['content'] = helpers.sanitize.html(payload['content'])

    const imageKeys = helpers.parseImageSources(payload['content'])
    imageKeys.forEach(imageUrl => services.s3.deleteObjectTagging(services.s3.getKeyPart(imageUrl)))

    try {
      payload['sharingKey'] = helpers.generateUUID(true)
      await orm.querySetter(c, Post).insert().into(Post).values(payload).execute()
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  update: async (c: IContext) => {
    if (!c.req.ip) {
      c.res.failed()
      return
    }

    const payload = c.req.body
    payload['board'] = { id : freeBoardId }

    try {
      await Post.validate(payload)
    } catch (e) {
      return c.res.failed(e)
    }

    payload['ip'] = c.req.ip
    payload['password'] = helpers.hashed(payload['password'])
    payload['content'] = helpers.sanitize.html(payload['content'])

    try {
      await getRepository(Post).save(payload)
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  all: async (c: IContext) => {
    try {
      const [data, total] = await orm.querySetter(c, Post)
        .andWhere(`board_id = ${freeBoardId}`)
        .getManyAndCount()

      await Promise.all([
        loadChildren({ c, model: Post, childModel: Reply, items: data }),
        loadChildren({ c, model: Post, childModel: Reaction, items: data }),
      ])
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
  detail: (c: IContext) => {
    orm.querySetter(c, Post)
      .leftJoinAndSelect('Post.board', 'board')
      .leftJoinAndSelect('Post.reactions', 'reactions')
      .leftJoinAndSelect('Post.replies', 'replies')
      .leftJoinAndSelect('replies.parent', 'parent')
      .where(`Post.id = ${c.req.params['id']}`).getOneOrFail()
        .then((post: Post) => {
          post.increaseViews(c)
          c.res.asJSON(post)
        })
        .catch(c.res.failed)
  },
  delete: async (c: IContext) => {
    if (!c.req.body['password']) {
      c.res.failed()
      return
    }
  
    try {
      const postRepository = getRepository(Post)
      const target = await postRepository.findOneOrFail(c.req.params['id'])
      if (!helpers.compare(target.password, c.req.body['password'])) {
        c.res.failed({ message: 'INCORRECT_PASSWORD' })
        return
      }
  
      await postRepository.softRemove(target)
      c.res.success()
    } catch (e) {
      c.res.failed()
      return    
    }
  },
  checkPassword: async (c: IContext) => {
    if (!c.req.body['password']) return c.res.failed({ message: 'MISSING_REQUIRED_FIELD_PASSWORD' })
  
    try {
      const target = await getRepository(Post).findOneOrFail(c.req.params['id'])
      if (!helpers.compare(target.password, c.req.body['password'])) {
        c.res.failed({ message: 'INCORRECT_PASSWORD' })
        return
      }
      c.res.success()
    } catch (e) {
      c.res.failed({ message: 'NOT_FOUND' })
    }
  },
}

export default postController