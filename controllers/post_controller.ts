import { getRepository } from 'typeorm'
import { loadChildren } from '../core/controller'
import { Post } from '../entities/post'
import { Reply } from '../entities/reply'
import { Reaction } from '../entities/reaction'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import helpers from '../core/helpers'

// 자유게시판 id
const freeBoardId = 1

const postController = {
  create: async (c: IContext) => {
    if (!c.req.ip) {
      c.res.failed()
      return
    }

    const bannedUser = helpers.useBannedUser(c.req.ip)
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

    if (!payload['$$originalPassword']) return c.res.failed({ message: 'BAD_REQUEST' })

    try {
      await Post.checkPassword(c.req.params['sharingKey'], payload['$$originalPassword'])
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
      const qb = orm.querySetter(c, Post)
        .andWhere(`board_id = ${freeBoardId}`)

      // LIKE 검색이 너무 많아서 나중에 규모가 커지면 ES등 튜닝 필요함
      const keyword = (c.req.query['query'] || '').split('=')[1]
      if (keyword) {
        qb.andWhere(`nickname LIKE "%${keyword}%"`)
        qb.orWhere(`title LIKE "%${keyword}%"`)
        qb.orWhere(`content LIKE "%${keyword}%"`)
      }

      const [data, total] = await qb.getManyAndCount()

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
      .where(`Post.sharing_key = '${c.req.params['sharingKey']}'`)
      .getOneOrFail()
        .then((post: Post) => {
          post['$$numReplies'] = (post.replies || []).filter(reply => !reply.deletedAt).length
          post.replies = helpers.organizeReplies(post.replies)

          // post.reactions 삭제 (추천한 사람들 ip 노출 방지)
          post['$$reactions'] = { up: { count: 0 }, down: { count: 0 } }
          post.reactions.forEach(reaction => {
            if (reaction.type === 'up') {
              post['$$reactions']['up'].count++
              post['$$reactions']['up'].activated = reaction.ip === c.req.ip
            }
            if (reaction.type === 'down') {
              post['$$reactions']['down'].count++
              post['$$reactions']['down'].activated = reaction.ip === c.req.ip
            }
          })
          delete post.reactions
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
      const target = await postRepository.findOneOrFail({ where: `Post.sharing_key = '${c.req.params['sharingKey']}'`})
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
      await Post.checkPassword(c.req.params['sharingKey'], c.req.body['password'])
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default postController