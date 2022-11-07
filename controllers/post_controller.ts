import { loadChildren } from '../core/controller'
import { Post } from '../entities/post'
import { Reply } from '../entities/reply'
import { Reaction } from '../entities/reaction'
import { User } from '../entities/user'
import { dataSource } from '../database'
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

    const bannedUser = helpers.useBannedUser({ ip: c.req.ip })
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

    const user = await helpers.jwt.mustUser(c)
    if (user) payload['user'] = user

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

    const user = await helpers.jwt.mustUser(c)
    let target: Post
    try {
      const postRepository = dataSource.getRepository(Post)
      target = await postRepository.findOneOrFail({ where: { sharingKey: c.req.params['sharingKey'] } })
      if (target.userId) {
        // 자기 자신의 글을 수정하기 때문에 비밀번호가 필요 없는 경우
        if (user['id'] !== target.userId) return c.res.failed()
      } else {
        // 익명 글을 수정하기 때문에 비밀번호가 필요한 경우
        await Post.checkPassword(c.req.params['sharingKey'], payload['$$originalPassword'])
      }
    } catch (e) {
      return c.res.failed(e)
    }

    if (!target) return c.res.failed({ message: 'NOT_FOUND' }, 404)

    target.ip = c.req.ip
    target.nickname = helpers.sanitize.html(payload['nickname'])
    target.password = helpers.hashed(payload['password'])
    target.title = helpers.sanitize.html(payload['title'])
    target.content = helpers.sanitize.html(payload['content'])

    try {
      await dataSource.getRepository(Post).save(target)
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  all: async (c: IContext) => {
    try {
      const qb = orm.querySetter(c, Post)
        .leftJoinAndSelect('Post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('Post.replies', 'replies')
        .leftJoinAndSelect('Post.reactions', 'reactions')
        .andWhere(`board_id = ${freeBoardId}`)

      // LIKE 검색이 너무 많아서 나중에 규모가 커지면 ES등 튜닝 필요함
      const keyword = (c.req.query['query'] || '').split('=')[1]
      if (keyword) {
        qb.andWhere(`Post.nickname LIKE "%${keyword}%"`)
        qb.orWhere(`replies.nickname LIKE "%${keyword}%"`)
        qb.orWhere(`replies.content LIKE "%${keyword}%"`)
        qb.orWhere(`profile.nickname LIKE "%${keyword}%"`)
        qb.orWhere(`Post.title LIKE "%${keyword}%"`)
        qb.orWhere(`Post.content LIKE "%${keyword}%"`)
      }

      const [data, total] = await qb.getManyAndCount()
      data.forEach((post: Post) => post.user = User.sensitiveAuthInfoFilteredUser(post.user) as any)
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
  detail: async (c: IContext) => {
    try {
      const post = await orm.querySetter(c, Post)
        .leftJoinAndSelect('Post.board', 'board')
        .leftJoinAndSelect('Post.reactions', 'reactions')
        .leftJoinAndSelect('Post.replies', 'replies')
        .leftJoinAndSelect('replies.user', 'rUser')
        .leftJoinAndSelect('rUser.profile', 'rProfile')
        .leftJoinAndSelect('Post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('replies.parent', 'parent')
        .where(`Post.sharing_key = '${c.req.params['sharingKey']}'`)
        .getOneOrFail() as Post

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
      post.user = User.sensitiveAuthInfoFilteredUser(post.user) as any
      delete post.reactions
      await post.increaseViews(c)
      c.res.asJSON(post)
    } catch (e) {
      c.res.failed({ message: 'NOT_FOUND' }, 404)
    }
  },
  delete: async (c: IContext) => {
    const user = await helpers.jwt.mustUser(c)
    if (!user && !c.req.body['password']) return c.res.failed()

    try {
      const postRepository = dataSource.getRepository(Post)
      const target = await postRepository.findOneOrFail({ where: { sharingKey: c.req.params['sharingKey'] } })
      if (target.userId) {
        // 자기 자신의 게시글을 삭제하기 때문에 비밀번호가 필요 없는 경우
        if (user['id'] !== target.userId) return c.res.failed()
      } else {
        // 익명 게시글을 삭제하기 때문에 비밀번호가 필요한 경우
        if (!helpers.compare(target.password, c.req.body['password'])) return c.res.failed({ message: 'INCORRECT_PASSWORD' })
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