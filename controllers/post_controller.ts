import { getRepository } from 'typeorm'
import { useCRUD } from '../core/controller'
import { Post } from '../entities/post'
import { Reply } from '../entities/reply'
import IContext from '../core/context'
import orm from '../core/orm'

// 자유게시판 id
const freeBoardId = 1

const defaultHandlers = useCRUD(Post)

const postController = {
  create: defaultHandlers.create,
  update: defaultHandlers.update,
  all: async (c: IContext) => {
    try {
      const [data, total] = await orm.querySetter(c, Post)
        .leftJoinAndSelect('Post.reactions', 'reactions')
        .where(`Post.board.id = ${freeBoardId}`)
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
        .then(c.res.asJSON)
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