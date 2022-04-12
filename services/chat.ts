import store from '../store'
import helpers from '../core/helpers'
import { sendMessage } from '../chat/server_chat'

export default {
  banIP: (ip, timeout) => {
    const d = helpers.dayjs().add(timeout, 'milliseconds')
    store.state.lastUserActions.message[ip] = d
    setTimeout(() => delete store.state.lastUserActions.message[ip], timeout)

    // 도배방지로 자연스럽게 적용된 경우가 아닌 관리자가 채팅을 금지시킨 경우
    if (timeout > store.state.globalVariables.lastUserActionTimeouts.message) {
      sendMessage({
        message: {
          type: 'alert',
          text: `채팅이 금지되었습니다. (해제: ${helpers.formatWithAdd({ date: d })}`,
        }, ip,
      })
    }

    return d
  },
  bannedUntil: ip => store.state.lastUserActions.message[ip],
}