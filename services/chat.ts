import store from '../store'
import dayjs = require('dayjs')
import { sendMessage } from '../chat/server-chat'

export default {
  banIP: (ip, timeout) => {
    const d = dayjs().add(timeout, 'milliseconds')
    const t = d.format()
    store.state.preventSpam.IPAddresses[ip] = t
    setTimeout(() => delete store.state.preventSpam.IPAddresses[ip], timeout)

    // 도배방지로 자연스럽게 적용된 경우가 아닌 관리자가 채팅을 금지시킨 경우
    if (timeout > store.state.globalVariables.chatFrequency) {
      sendMessage({
        message: {
          type: 'alert',
          text: `채팅이 금지되었습니다. (해제: ${t}`,
        }, ip
      })
    }

    return t
  },
  bannedUntil: ip => store.state.preventSpam.IPAddresses[ip],
}