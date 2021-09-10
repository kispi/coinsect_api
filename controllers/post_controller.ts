import IContext from '../core/context'
import orm from '../core/orm'
import { useCRUD } from '../core/controller'
import { Post } from '../entities/post'

// 자유게시판 id
const freeBoardId = 1

const postController = useCRUD(Post, true)

postController.all = (c: IContext) => {
  orm.querySetter(c, Post)
    .leftJoinAndSelect('Post.board', 'board')
    .leftJoinAndSelect('Post.reactions', 'reactions')
    .leftJoinAndSelect('Post.replies', 'replies')
    .leftJoinAndSelect('replies.parent', 'parent')
    .where(`Post.board.id = ${freeBoardId}`)
      .getManyAndCount()
      .then(res => c.res.asJSON({
        data: res[0],
        total: res[1],
      }))
      .catch(c.res.failed)
},

postController.detail = (c: IContext) => {
  orm.querySetter(c, Post)
    .leftJoinAndSelect('Post.board', 'board')
    .leftJoinAndSelect('Post.reactions', 'reactions')
    .leftJoinAndSelect('Post.replies', 'replies')
    .leftJoinAndSelect('replies.parent', 'parent')
    .where(`Post.id = ${c.req.params['id']}`).getOneOrFail()
      .then(c.res.asJSON)
      .catch(c.res.failed)
}

export default postController