import { sendMessage } from '../chat/server-chat'
import { Message } from '../entities/message'
import { BadWord } from '../entities/bad_word'
import { Board } from '../entities/board'
import { Post } from '../entities/post'
import { Reaction } from '../entities/reaction'
import { useCRUD } from '../core/controller'
import IContext from '../core/context'
import useService from '../services'
import store from '../store'
import orm from '../core/orm'

const service = useService()

const routesChat = {
  banIP: (c: IContext) => {
    if (!c.req.body['ip'] || !c.req.body['timeout']) {
      c.res.failed('missing params: ip, timeout')
      return
    }

    const until = service.chat.banIP(c.req.body['ip'], c.req.body['timeout'])
    c.res.asJSON({ data: until })
  },
  sendMessage: (c: IContext) => {
    sendMessage({
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
  message: {
    invalidate: (c: IContext) => store.actions.loadRecentMessages().then(c.res.asJSON)
  },
}

const routesPost = useCRUD(Post, true)

routesPost.detail = (c: IContext) => {
  orm.querySetter(c, Post)
    .leftJoinAndSelect('Post.board', 'board')
    .leftJoinAndSelect('Post.replies', 'replies')
    .leftJoinAndSelect('replies.parent', 'parent')
    .where(`Post.id = ${c.req.params['id']}`).getOneOrFail()
      // 여기서 뭔가 리플들 재귀적으로 쭉 매핑해주는걸 하면 좋을듯
      .then(c.res.asJSON)
      .catch(c.res.failed)
}

const adminController = {
  chat: routesChat,
  store: routesStore,
  badWord: useCRUD(BadWord),
  board: useCRUD(Board, true),
  message: useCRUD(Message),
  post: routesPost,
  reaction: useCRUD(Reaction),
}

export default adminController