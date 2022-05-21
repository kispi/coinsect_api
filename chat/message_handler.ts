import coreHelpers from '../core/helpers'
import useService from '../services'
import helpers from './helpers'
import store from './store'
import { IMessage } from './types'

const service = useService()

const messageHandlers = ({ message, ip, token }:  { message: IMessage, ip: string, token: string }) => ({
  text: () => {
    if (message.type !== 'text') return
  
    const bannedUser = coreHelpers.useBannedUser(ip)
    if (bannedUser) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: `채팅 제한 해제: ${helpers.formatWithAdd({ date: bannedUser.until })}`,
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
  
    helpers.saveMessage(message, ip)
  
    if (service.badWord.includedIn(message.text)) message.text = service.badWord.filtered(message.text)
    helpers.broadcast(message)
    return
  },
  connections: () => {
    helpers.sendMessage({
      message: {
        type: 'connections',
        meta: store.getters.connections().map(conn => ({ ip: conn.ip, user: conn.user })),
      }, token,
    })
  },
  ping: () => {
    const user = store.getters.user(token)
    if (user && message.user) user.path = message.user.path

    helpers.sendMessage({
      message: {
        type: 'pong'
      },
      token,
    })
  },
})

export default messageHandlers