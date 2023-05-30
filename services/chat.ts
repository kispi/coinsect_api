import { IUser } from '../chat/types'
import store from '../store'
import axios from 'axios'

const endpoint = store.state.serverConfig.COINSECT_CHAT

const chatService = {
  getUser: async (token: string): Promise<IUser> => {
    try {
      return await axios.get(`${endpoint}/webchat/users/${token}`)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  broadcast: async message => {
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
      return Promise.reject(e)
    }
  },
  broadcastPushNotifications: async message => {
    try {
      await axios.post(endpoint + '/webchat/push_notifications', message)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  invalidate: async () => {
    try {
      await axios.post(endpoint + '/webchat/messages/invalidate', {})
    } catch (e) {
      return Promise.reject(e)
    }
  },
  // 주고 받는 reactions가 크지 않을 것으로 생각됨.
  updateReactions: async ({ messageId, reactions }) => {
    try {
      await axios.post(endpoint + `/webchat/messages/${messageId}/update_reactions`, { reactions })
    } catch (e) {
      return Promise.reject(e)
    }
  },
  banIP: async (ip: string, timeout: number) => {
    try {
      return await axios.post(endpoint + '/webchat/ban_ip', { ip, timeout })
    } catch (e) {
      return Promise.reject(e)
    }
  },
  deleteOldUsers: async (hoursPassed: number) => {
    try {
      await axios.delete(`${endpoint}/webchat/users/old`, { params: { hoursPassed } })
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default chatService