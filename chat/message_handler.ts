import { IMessage } from './types'
import { log } from '../core/logger'
import coreHelpers from '../core/helpers'
import useService from '../services'
import helpers from './helpers'
import store from './store'

const service = useService()

const messageHandlers = ({ message, ip, token }:  { message: IMessage, ip: string, token: string }) => ({
  image: () => {
    if (!store.getters.config().allowImageMessage) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: '현재 이미지 업로드 기능을 사용할 수 없습니다 😢',
        },
        token,
      })
      return
    }

    messageHandlers({ message, ip, token }).text()
  },
  text: async () => {
    const bannedUser = coreHelpers.useBannedUser({ ip, token })
    if (bannedUser) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: `
            채팅이 제한되었습니다
            해제: ${helpers.formatWithAdd({ date: bannedUser.until })}
            사유: ${bannedUser.reason}
          `,
        },
        token,
      })
      return
    }
  
    const t = store.getters.bannedUntil(ip)
    if (t) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: helpers.dayjs(t).diff(helpers.dayjs(), 'second') < store.getters.config().allowedChatFrequency ?
            '너무 빠른 채팅은 타인에게 피해를 줄 수 있습니다 🙂' :
            `채팅 제한 해제: ${helpers.formatWithAdd({ date: t })}`,
          // 정확한 로직은 아니지만, 관리자에게 채금먹은 사람이 하필 남은 채금시간이 0.5초 미만일 때 채팅을 시도할 확률은 드물기 때문에 그냥 이렇게 간단히 처리해둠.
        },
        token,
      })
      return
    }
  
    // 마지막 메시지 이후 무조건 0.2초는 밴
    store.actions.banIP(ip, store.getters.config().allowedChatFrequency)
    if (!(message.text || '').trim() || message.text.length > store.getters.config().messageMaxLength) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: '입력하신 메시지가 너무 깁니다. 만약 이미지를 업로드하신 경우라면 파일명을 짧게 해주세요.',
        },
        token,
      })
      return
    }

    if (await service.aws.rekognition.isTextIncludingGraphicImageUrl(message.text)) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: '음란물을 업로드하는 경우 통신매체이용음란죄로 형사처벌될 수 있습니다.',
        },
        token,
      })
      helpers.saveMessage({ message, ip, softDelete: true })
      return
    }

    let savedMessage
    try {
      savedMessage = await helpers.saveMessage({ message, ip })
    } catch (e) {
      log.error('failed to save message:', e)
    }

    if (savedMessage) message['id'] = savedMessage.id

    if (message.type === 'text') message.text = service.badWord.filtered(message.text)

    helpers.broadcast(message)
    return
  },
  users: () => {
    helpers.sendMessage({
      message: {
        type: 'users',
        meta: store.getters.connections().map(conn => conn.user),
      }, token,
    })
  },
  ping: () => {
    const user = store.getters.user(token)
    if (user.profile.sentiment && helpers.dayjs(user.profile.sentiment.expireAt).isBefore(helpers.dayjs())) {
      delete user.profile.sentiment
    }

    if (user && message.user) user.path = message.user.path

    helpers.sendMessage({
      message: {
        type: 'pong'
      },
      token,
    })
  },
})

export default messageHandlers