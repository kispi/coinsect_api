import store from '../store'
import axios from 'axios'
import { IUser } from '../chat/types'

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
  invalidate: async () => {
    try {
      await axios.post(endpoint + '/webchat/messages/invalidate', {})
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
}

export default chatService