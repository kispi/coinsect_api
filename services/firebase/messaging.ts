import axios from 'axios'
import { log } from '../../core/logger'
import store from '../../store'

const apiKey = store.state.serverConfig.FCM

const messaging = {
  send: async payload => {
    if (!apiKey) {
      log.error('firebase.messaging.send: .env FCM is missing')
      return
    }

    try {
      await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${apiKey}`
        },
      })
    } catch (e) {
      console.error(e)
    }
  },
}

export default messaging