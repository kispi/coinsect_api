import coreHelpers from '../core/helpers'
import useService from '../services'
import helpers from './helpers'
import store from './store'
import { IMessage } from './types'

const service = useService()

const messageHandler = ({ message, token, ip }) => {
  const o: IMessage = JSON.parse(message)
  if (o.type === 'text') {
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
    if (!(o.text || '').trim() || o.text.length > store.getters.config().messageMaxLength) return

    helpers.saveMessage(o, ip)

    if (service.badWord.includedIn(o.text)) o.text = service.badWord.filtered(o.text)
    helpers.broadcast(o)
    return
  }

  if (o.type === 'connections') {
    helpers.sendMessage({
      message: {
        type: 'connections',
        meta: store.getters.connections().map(conn => ({ ip: conn.ip, user: conn.user })),
      }, token,
    })
  }

  if (o.type === 'ping') {
    helpers.sendMessage({
      message: {
        type: 'pong'
      },
      token,
    })
  }

  if (o.type === 'account' && (o.user || {}).token && (o.user || {}).profile) {
    const user = store.getters.user(o.user.token)
    user.profile.nickname = coreHelpers.sanitize.strict(o.user.profile.nickname)
    const connections = store.getters.targetConnections({ token: o.user.token })
    connections.forEach(conn => {
      o.user = user
      conn.user = o.user
    })

    helpers.sendMessage({
      message: {
        type: 'account',
        user: o.user,
      },
      token,
    })
  }
}


export default messageHandler