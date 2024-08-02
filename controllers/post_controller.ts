import { Post } from '../entities/post'
import { dataSource } from '../database'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import helpers from '../core/helpers'
import postService from '../services/post'

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
    if (!payload['board']) payload['board'] = { id : freeBoardId }

    try {
      await Post.validate(payload as Post)
    } catch (e) {
      return c.res.failed(e)
    }

    payload['ip'] = c.req.ip
    payload['title'] = payload['title']
    payload['content'] = helpers.sanitize.html(payload['content'])

    const user = await helpers.jwt.mustUser(c)
    if (user) {
      payload['user'] = user
      delete payload['password']
    } else {
      if (!payload['password']) return c.res.failed({ message: 'password is required' })
      payload['password'] = helpers.crypto.hashed(payload['password'])
    }

    try {
      payload['sharingKey'] = helpers.crypto.generateUUID(true)
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

    try {
      await Post.validate(payload as Post)
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
    target.board = payload['board']
    target.nickname = helpers.sanitize.strict(payload['nickname'])
    target.title = payload['title']
    target.content = helpers.sanitize.html(payload['content'])

    if (user) {
      target.userId = user['id']
      delete payload['password']
    } else {
      target.password = helpers.crypto.hashed(payload['password'])
    }

    try {
      target.lastEdit = new Date()
      await Post.save(target)
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  sitemap: async (c: IContext) => {
    try {
      const data = await postService.sitemap(c)
      c.res.asJSON(data)
    } catch (e) {
      c.res.failed(e)
    }
  },
  allWithLLM: async (c: IContext) => {
    try {
      const { data, total } = await postService.allWithLLM(c)
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed({ message: 'NOT_FOUND' } , 404)
    }
  },
  all: async (c: IContext) => {
    try {
      const { data, total } = await postService.all(c)
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
        .withDeleted()
        .leftJoinAndSelect('Post.replies', 'replies')
        .leftJoinAndSelect('replies.user', 'rUser')
        .leftJoinAndSelect('rUser.profile', 'rProfile')
        .leftJoinAndSelect('Post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('replies.parent', 'parent')
        .leftJoinAndSelect('replies.reactions', 'rReactions')
        .where(`Post.sharing_key = '${c.req.params['sharingKey']}'`)
        .andWhere('Post.deleted_at IS NULL')
        .getOneOrFail() as Post

      post.mutatePostToBeSecure(c.req.ip)
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
        if (!helpers.crypto.compare(target.password, c.req.body['password'])) return c.res.failed({ message: 'INCORRECT_PASSWORD' })
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