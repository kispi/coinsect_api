import { Brackets } from 'typeorm'
import { Post } from '../entities/post'
import { loadChildren } from '../core/controller'
import { Reply } from '../entities/reply'
import { Reaction } from '../entities/reaction'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'

const postService = {
  all: async (c: IContext, overridableQuery?: unknown) => {
    // 구현이 그다지 맘에 들지는 않지만 어쨌든 컨텍스트(c)는 일회용이기 때문에, 덮어써도 무관하다
    if (overridableQuery) c.req.query = overridableQuery

    if (c.req.query['limit'] > 20) return Promise.reject({ message: 'limit exceeded 20' })

    try {
      const qb = orm.querySetter(c, Post)
        .leftJoinAndSelect('Post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('Post.board', 'board')

      // LIKE 검색이 너무 많아서 나중에 규모가 커지면 ES등 튜닝 필요함
      const keyword = (c.req.query['query'] || '').split('=')[1]
      if (keyword) {
        qb.andWhere(new Brackets(subQb => subQb
          .where(`Post.nickname LIKE "%${keyword}%"`)
          .orWhere(`profile.nickname LIKE "%${keyword}%"`)
          .orWhere(`Post.title LIKE "%${keyword}%"`)
          .orWhere(`Post.content LIKE "%${keyword}%"`)
        ))
      }

      if (!c.req.query['limit']) qb.limit(20)

      const [data, total] = await qb.getManyAndCount()
      await Promise.all([
        loadChildren({ c, model: Post, childModel: Reply, items: data }),
        loadChildren({ c, model: Post, childModel: Reaction, items: data }),
      ])
      data.forEach((post: Post) => post.mutatePostToBeSecure(c.req.ip))
      return { data, total }
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default postService