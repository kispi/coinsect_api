import { initializeApp, cert } from 'firebase-admin/app'
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging'
import { log } from '../../core/logger'

const init = async () => {
  try {
    const result = require('./fcm_cert')
    initializeApp({ credential: cert(result.default) })
  } catch (e) {
    log.warn(`firebase.messaging: missing credential. make sure you have 'fcm_cert.ts'`)
  }
}

init()

const messaging = {
  send: (message: MulticastMessage) => getMessaging().sendMulticast(message),
}

export default messaging