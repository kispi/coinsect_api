import { Brackets } from 'typeorm'
import { Post } from '../entities/post'
import { loadChildren } from '../core/controller'
import { Reply } from '../entities/reply'
import { Reaction } from '../entities/reaction'
import { GoogleGenerativeAI } from '@google/generative-ai'
import store from '../store'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'

const postService = {
  sitemap: async (c: IContext) => {
    try {
      const queryResult = await orm.querySetter(c, Post)
        .where('board_id = :boardId', { boardId: c.req.params['boardId'] })
        .select(['sharing_key'])
        .getRawMany()
      return { data: queryResult.map(r => r.sharing_key), total: queryResult.length }
    } catch (e) {
      return Promise.reject(e)
    }
  },
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
  allWithLLM: async (c: IContext) => {
    const boardId = c.req.query['board_id']
    const q = c.req.query['query']
    if (!boardId || !q) return Promise.reject({ message: 'board_id or query is missing' })

    try {
      const [data, _] = await c.orm.getRepository(Post).createQueryBuilder()
        .leftJoinAndSelect('Post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('Post.board', 'board')
        .where('Post.board = :boardId', { boardId })
        .getManyAndCount()
      await Promise.all([
        loadChildren({ c, model: Post, childModel: Reply, items: data }),
        loadChildren({ c, model: Post, childModel: Reaction, items: data }),
      ])
      data.forEach((post: Post) => post.mutatePostToBeSecure(c.req.ip))

      const genAI = new GoogleGenerativeAI(store.state.serverConfig.GOOGLE_AI_STUDIO)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      })

      const text = `
User is asking a question:"${q}" about bitcoin.
Choose the most appropriate 3 (at most) posts within the list below.
Response should be an array of number, sort by fitness DESC. (id of the post)
If you can't find any, please respond with an empty array.
You don't need to fill 3, just return 0~3 posts.

${data.map((post: Post) => `post.id: ${post.id} / post.title: ${post.title}`).join('\n')}
      `.trim()

      const result = await model.generateContent([{ text }])
      const selectedPosts = data.filter((post: Post) => JSON.parse(result.response.text()).includes(post.id))
      return { data: selectedPosts, total: selectedPosts.length }
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default postService