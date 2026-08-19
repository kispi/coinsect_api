import { Brackets } from 'typeorm'
import { Post } from '../entities/post'
import { loadChildren } from '../core/controller'
import { Reply } from '../entities/reply'
import { Reaction } from '../entities/reaction'
import { GoogleGenAI } from '@google/genai'
import { log } from '../core/logger'
import store from '../store'
import IContext from '../core/interfaces/context'
import orm, { QueryOverrides } from '../core/orm'

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
  all: async (c: IContext, overrides?: QueryOverrides) => {
    const query = overrides || c.req.query

    if (query['limit'] > 20) return Promise.reject({ message: 'limit exceeded 20', status: 400 })

    try {
      const qb = orm.querySetter(c, Post, overrides)
        .leftJoinAndSelect('Post.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('Post.board', 'board')

      // LIKE 검색이 너무 많아서 나중에 규모가 커지면 ES등 튜닝 필요함
      const keyword = query['keyword']
      if (keyword) {
        // 값에 든 %와 _를 리터럴로 만든다. 이스케이프하지 않으면 조건이 임의로 넓어진다.
        const pattern = `%${keyword.replace(/[\\%_]/g, ch => `\\${ch}`)}%`
        qb.andWhere(new Brackets(subQb => subQb
          .where('Post.nickname LIKE :pattern', { pattern })
          .orWhere('profile.nickname LIKE :pattern', { pattern })
          .orWhere('Post.title LIKE :pattern', { pattern })
          .orWhere('Post.content LIKE :pattern', { pattern })
        ))
      }

      if (!query['limit']) qb.limit(20)

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
    const boardId = c.req.query['boardId']
    const q = c.req.query['question']
    if (!boardId || !q) return Promise.reject({ message: 'boardId or question is missing', status: 400 })

    log.info(`allWithLLM: query "${q}" (IP: ${c.req.ip})`)

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

      const genAI = new GoogleGenAI({ apiKey: store.state.serverConfig.GOOGLE_AI_STUDIO })
      const generate = (parts: Array<{ text: string }>) => genAI.models.generateContent({
        model: 'gemini-flash-latest',
        contents: parts,
        config: {
          responseMimeType: 'application/json',
        },
      })

      const prompt1 = `
User is asking a question: "${q}" about bitcoin.
Choose the most appropriate 3 (at most) posts within the list below.
Response should be an array of number.
If you can't find any, please respond with an empty array.
You don't need to fill 3, just return 0~3 posts.

${data.map((post: Post) => `post.id: ${post.id} / post.title: ${post.title}`).join('\n')}
      `.trim()

      const result1 = await generate([{ text: prompt1 }])
      const selectedPosts = data.filter((post: Post) => JSON.parse(result1.text).includes(post.id))

      const prompt2 = `
OK, you have chosen the following posts:
${selectedPosts.map((post: Post) => `post.id: ${post.id} / post.title: ${post.title} / post.content: ${post.content}`).join('\n')}
Using the information above, provide a answer to the user's question: "${q}" about bitcoin.
The result JSON should be a form of { "kr": String, "en": String }
      `
      const result2 = await generate([{ text: prompt2 }])
      return { data: selectedPosts, total: selectedPosts.length, answer: JSON.parse(result2.text) }
    } catch (e) {
      log.error('allWithLLM:', e)
      return Promise.reject(e)
    }
  },
}

export default postService