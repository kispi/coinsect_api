import store from '../store'
import dayjs = require('dayjs')

export default {
  banIP: (ip, timeout) => {
    const d = dayjs()
    d.add(timeout, 'milliseconds')
    store.state.preventSpam.IPAddresses[ip] = d.format('YYYY-MM-DD HH:mm:ss')
    setTimeout(() => delete store.state.preventSpam.IPAddresses[ip], timeout)
  },
  bannedUntil: ip => store.state.preventSpam.IPAddresses[ip],
}