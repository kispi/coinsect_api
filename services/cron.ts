import store from '../store'
import axios from 'axios'
import cron from '../core/cron'
import walletService from './wallet'
import { IUser } from '../chat/types'
import chatService from './chat'

const endpoint = store.state.serverConfig.COINSECT_CHAT

const cronService = {
  getUser: async (token: string): Promise<IUser> => {
    try {
      return await axios.get(`${endpoint}/webchat/users/${token}`)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  run: () => {
    cron.addJob({
      id: 'renewWalets',
      runnable: walletService.renewAll,
      interval: 1000 * 60 * 60,
    })
    cron.addJob({
      id: 'deleteOldChatUsers',
      runnable: () => chatService.deleteOldUsers(48),
      interval: 1000 * 60 * 60,
    })
    cron.run()
  },
}

export default cronService