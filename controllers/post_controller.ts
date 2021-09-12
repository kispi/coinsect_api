import { getRepository } from 'typeorm'
import { useCRUD, trimAndValidateRequiredFields } from '../core/controller'
import { Post } from '../entities/post'
import { Reply } from '../entities/reply'
import IContext from '../core/context'
import orm from '../core/orm'
import helpers from '../core/helpers'
import store from '../store'

// 자유게시판 id
const freeBoardId = 1

const defaultHandlers = useCRUD(Post)

const postController = {
  create: (c: IContext) => {
    const payload = c.req.body
    if (!payload['board']['id']) {
      c.res.failed()
      return
    }

    const requiredFields = ['title', 'content', 'nickname', 'password']
    if (!trimAndValidateRequiredFields(c, requiredFields)) {
      c.res.failed()
      return
    }

    payload['ip'] = c.req.ip
    payload['password'] = helpers.hashedPassword(payload['password'])
    payload['content'] = helpers.sanitizeHtml(payload['content'])
    if (!c.req.ip) {
      c.res.failed()
      return
    }

    orm.querySetter(c, Post).insert().into(Post).values(payload).execute()
      .then(() => c.res.success())
      .catch(c.res.failed)
  },
  update: defaultHandlers.update,
  all: async (c: IContext) => {
    try {
      const [data, total] = await orm.querySetter(c, Post)
        .leftJoinAndSelect('Post.reactions', 'reactions')
        .where(`board.id = ${freeBoardId}`)
        .where(`post_type = "normal"`)
        .getManyAndCount()

      const postIds = data.map((post: Post) => post.id)
      const replies = await orm.querySetter(c, Reply).where(`Reply.post.id IN (:id)`, { id: postIds }).getMany()
      const repliesMap = {}
      replies.forEach((reply: Reply) => repliesMap[reply.postId] ? repliesMap[reply.postId].push(reply) : repliesMap[reply.postId] = [reply])
      data.forEach((post: Post) => post.replies = repliesMap[post.id])
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
      if (target.password !== c.req.body['password']) {
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
    if (!c.req.body['password']) return c.res.failed({ message: 'invalid payload' })
  
    try {
      const target = await getRepository(Post).findOneOrFail(c.req.params['id'])
      if (target.password !== c.req.body['password']) {
        c.res.failed({ message: 'INCORRECT_PASSWORD' })
        return
      }
  
      c.res.success()
    } catch (e) {
      c.res.failed({ message: 'Post not found' })
    }
  },
}

export default postController