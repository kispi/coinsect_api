import store from '../store'
import axios from 'axios'
import helpers from '../core/helpers'
import { IUser } from '../chat/types'

const endpoint = store.state.serverConfig.COINSECT_CHAT

const chatService = {
  getUser: async (token: string): Promise<IUser> => {
    console.log('토큰', token)
    try {
      return await axios.get(`${endpoint}/webchat/users/${token}`)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  broadcast: async message => {
    console.log('이건 또 됨?', message)
    try {
      await axios.post(endpoint + '/webchat/messages/broadcast', { message })
    } catch (e) {
      return Promise.reject(e)
    }
  },
  sendMessage: async ({ message, token, ip }: { message, token?: string, ip?: string }) => {
    try {
      await axios.post(endpoint + '/webchat/messages', { message, ip, token })
    } catch (e) {
      console.error('axios error:', e)
      return Promise.reject(e)
    }
  },
  banIP: (ip, timeout) => {
    const date = helpers.dayjs().add(timeout, 'milliseconds')
    store.state.lastUserActions.message[ip] = date
    setTimeout(() => delete store.state.lastUserActions.message[ip], timeout)

    // 도배방지로 자연스럽게 적용된 경우가 아닌 관리자가 채팅을 금지시킨 경우
    if (timeout > store.state.globalVariables.lastUserActionTimeouts.message) {
      chatService.sendMessage({
        message: {
          type: 'alert',
          text: `채팅이 금지되었습니다. (해제: ${helpers.formatWithAdd({ date })}`,
        }, ip,
      })
    }

    return date
  },
  bannedUntil: (ip: string) => store.state.lastUserActions.message[ip],
}

export default chatService