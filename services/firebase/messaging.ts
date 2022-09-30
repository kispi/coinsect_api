import { initializeApp, cert } from 'firebase-admin/app'
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging'

initializeApp({ credential: cert(require('./fcm_cert.json')) })

const messaging = {
  send: (message: MulticastMessage) => getMessaging().sendMulticast(message),
}

export default messaging