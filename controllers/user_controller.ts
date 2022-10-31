import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import { dataSource } from '../database'
import { Message } from '../entities/message'
import { Post } from '../entities/post'
import { Reply } from '../entities/reply'
import { User } from '../entities/user'

const getStats = async (userId: number) => {
  if (!userId) return

  const stats = {
    numMessages: 0,
    numMessagesReplyTo: 0,
    numPosts: 0,
    numReplies: 0,
    numRepliesReplyTo: 0,
  }

  try {
    const myMessages = await dataSource.getRepository(Message).find({ where: { userId }})
    const myPosts = await dataSource.getRepository(Post).find({ where: { userId }})
    const myReplies = await dataSource.getRepository(Reply).find({ where: { userId }})
    stats.numPosts = myPosts.length
    stats.numMessages = myMessages.length
    stats.numReplies = myReplies.length
    return stats
  } catch (e) {
    return Promise.reject(e)
  }
}

const userController = {
  me: async (c: IContext) => {
    try {
      const decodedUser = await helpers.jwt.getPayload(c)
      if (!decodedUser['id']) return c.res.failed({ message: 'invalid jwt token' })
  
      const user = await c.orm.getRepository(User).findOne({
        where: { id: decodedUser['id'] },
        relations: ['profile'],
      })
      delete user.password
      c.res.success(user)
    } catch (e) {
      c.res.failed(e)
    }
  },
  myStats: async (c: IContext) => {
    const user = await helpers.jwt.mustUser(c)
    if (!user) return c.res.failed()

    try {
      const stats = await getStats(user['id'])
      c.res.success({
        stats,
      })
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default userController