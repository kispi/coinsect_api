import { initializeApp, cert } from 'firebase-admin/app'
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging'
import fcmCert from './fcm_cert'

initializeApp({ credential: cert(fcmCert as any) })

const messaging = {
  send: (message: MulticastMessage) => getMessaging().sendMulticast(message),
}

export default messaging