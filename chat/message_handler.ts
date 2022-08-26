import { IMessage } from './types'
import { log } from '../core/logger'
import coreHelpers from '../core/helpers'
import useService from '../services'
import helpers from './helpers'
import store from './store'

const service = useService()

const messageHandlers = ({ message, ip, token }:  { message: IMessage, ip: string, token: string }) => ({
  image: () => messageHandlers({ message, ip, token }).text(),
  text: async () => {
    const bannedUser = coreHelpers.useBannedUser(ip)
    if (bannedUser) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: `
            채팅이 제한되었습니다
            해제: ${helpers.formatWithAdd({ date: bannedUser.until })}
            사유: ${bannedUser.reason}
          `,
        },
        token,
      })
      return
    }
  
    const t = store.getters.bannedUntil(ip)
    if (t) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: `채팅 제한 해제: ${helpers.formatWithAdd({ date: t })}`,
        },
        token,
      })
      return
    }
  
    // 마지막 메시지 이후 무조건 0.2초는 밴
    store.actions.banIP(ip, store.getters.config().allowedChatFrequency)
    if (!(message.text || '').trim() || message.text.length > store.getters.config().messageMaxLength) return

    let savedMessage
    try {
      savedMessage = await helpers.saveMessage(message, ip)
    } catch (e) {
      log.error('failed to save message:', e)
    }

    if (savedMessage) message['id'] = savedMessage.id

    if (message.type === 'text') message.text = service.badWord.filtered(message.text)

    helpers.broadcast(message)
    return
  },
  users: () => {
    helpers.sendMessage({
      message: {
        type: 'users',
        meta: Object.values(store.getters.users()).filter(u => helpers.dayjs(u['lastSeen']).isAfter(helpers.dayjs().add(-30, 'seconds'))), // 핑은 30초 간격으로 날리기 때문
      }, token,
    })
  },
  ping: () => {
    const user = store.getters.user(token)
    if (user.profile.sentiment && helpers.dayjs(user.profile.sentiment.expireAt).isBefore(helpers.dayjs())) {
      delete user.profile.sentiment
    }

    if (user && message.user) user.path = message.user.path

    user.lastSeen = helpers.dayjs().format()
    user.lastIP = ip
    store.actions.updateUser(user)

    helpers.sendMessage({
      message: {
        type: 'pong'
      },
      token,
    })
  },
})

export default messageHandlers