import { BadWord } from '../entities/bad_word'
import { BannedUser } from '../entities/banned_user'
import { Blockchain } from '../entities/blockchain'
import { Board } from '../entities/board'
import { Image } from '../entities/image'
import { Message } from '../entities/message'
import { Notification } from '../entities/notification'
import { Person } from '../entities/person'
import { Post } from '../entities/post'
import { Reaction } from '../entities/reaction'
import { Reply } from '../entities/reply'
import { Wallet } from '../entities/wallet'
import { WhaleAlert } from '../entities/whale_alert'
import { useCRUD } from '../core/controller'
import IContext from '../core/interfaces/context'
import useService from '../services'
import store from '../store'
import orm from '../core/orm'
import cron from '../core/cron'
import helpers from '../core/helpers'
import chatService from '../services/chat'

const service = useService()

const routesChat = {
  banIP: async (c: IContext) => {
    if (!c.req.body['ip'] || !c.req.body['timeout']) {
      c.res.failed({ message: 'missing params: ip, timeout' })
      return
    }

    const until = await service.chat.banIP(c.req.body['ip'], c.req.body['timeout'])
    c.res.asJSON({ data: until })
  },
  createBannedUser: async (c: IContext) => {
    if (!c.req.body['ip'] || !c.req.body['timeout']) {
      c.res.failed({ message: 'missing params: ip, timeout' })
      return
    }

    const date = helpers.dayjs().add(c.req.body['timeout'], 'milliseconds')
    try {
      await c.orm.createQueryBuilder()
        .insert().into(BannedUser).values([{
          ip: c.req.body['ip'],
          token: c.req.body['token'],
          reason: '운영 정책 위반',
          until: date.format(),
        }]).execute()

      if (c.req.body['deleteMessages'] === 'ok') await c.orm.createQueryBuilder().where(`ip = "${c.req.body['ip']}"`).delete().from(Message).execute()
      chatService.invalidate()
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
  sendMessage: (c: IContext) => {
    service.chat.sendMessage({
      message: {
        type: 'admin',
        text: c.req.body['text'],
      },
      token: c.req.body['token'],
      ip: c.req.body['ip'],
    })
  },
}

const routesStore = {
  badWord: {
    all: (c: IContext) => c.res.asJSON(store.state.badWords),
    invalidate: (c: IContext) => store.actions.loadBadWords().then(c.res.asJSON)
  },
  bannedUser: {
    all: (c: IContext) => c.res.asJSON(store.state.bannedUsers),
    invalidate: (c: IContext) => store.actions.loadBannedUsers().then(c.res.asJSON)
  },
  message: {
    invalidate: async (c: IContext) => {
      try {
        await service.chat.invalidate()
        c.res.success()
      } catch (e) {
        c.res.failed(e)
      }
    }
  },
  setAdminToken: (c: IContext) => {
    store.state.adminToken = c.req.body['token']
    c.res.success()
  },
}

const routesPost = useCRUD({ model: Post, useSoftDelete: true, withDeleted: true })

routesPost.detail = (c: IContext) => {
  orm.querySetter(c, Post)
    .withDeleted()
    .leftJoinAndSelect('Post.board', 'board')
    .leftJoinAndSelect('Post.replies', 'replies')
    .leftJoinAndSelect('replies.parent', 'parent')
    .where(`Post.id = ${c.req.params['id']}`).getOneOrFail()
      .then(c.res.asJSON)
      .catch(c.res.failed)
}

const adminController = {
  cron: {
    all: (c: IContext) => c.res.success(cron.stats()),
  },
  chat: routesChat,
  store: routesStore,
  badWord: useCRUD({ model: BadWord }),
  bannedUser: useCRUD({ model: BannedUser }),
  blockchain: useCRUD({ model: Blockchain }),
  board: useCRUD({ model: Board, useSoftDelete: true }),
  image: useCRUD({ model: Image }),
  message: useCRUD({ model: Message, useSoftDelete: true, withDeleted: true }),
  notification: useCRUD({ model: Notification }),
  person: useCRUD({ model: Person, useSoftDelete: true }),
  post: routesPost,
  reaction: useCRUD({ model: Reaction }),
  reply: useCRUD({ model: Reply, useSoftDelete: true }),
  wallet: useCRUD({ model: Wallet }),
  whaleAlert: useCRUD({ model: WhaleAlert }),
}

export default adminController