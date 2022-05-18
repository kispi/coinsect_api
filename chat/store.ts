import { getConnection } from 'typeorm'
import { Message } from '../entities/message'
import { IConnection, IMessage } from './types'
import useCache from '../core/cache'
import helpers from './helpers'
const dayjs = require('dayjs')

const cache = useCache()

const state = {
  config: {
    numLatestMessages: 100,
    allowedChatFrequency: 500, // ms. determine how frequently users can chat
    messageMaxLength: 120,
  },
  bannedUntil: {} as { ip: string },
  users: cache.get('chat:users') || {},
  connections: [] as IConnection[],
  recentMessages: [] as Array<IMessage>,
}

const getters = {
  config: () => state.config,
  bannedUntil: (ip: string) => state.bannedUntil[ip],
  recentMessages: () => state.recentMessages,
  user: (token: string) => state.users[token],
  tokens: () => state.connections.map(conn => conn.user.token),
  connections: () => state.connections,
  targetConnections: ({ ip, token }: { ip?: string, token?: string }) => state.connections.filter(conn => {
    if (ip) return conn.ip === ip
    if (token) return conn.user.token === token
  })
}

const actions = {
  createUser: (token: string) => ({
    token,
    profile: {
      nickname: helpers.recommendNickname(),
    },
  }),
  setUser: ({ token, connection, ip }) => {
    // 해당 토큰의 유저 계정이 있으면 사용, 없으면 만들어줌
    const user = getters.user(token) || actions.createUser(token)
    state.users[token] = user
    cache.set('chat:users', state.users)
    state.connections.push({ connection, user, ip })
    helpers.sendMessage({ message: { type: 'auth', user }, token })
  },
  loadRecentMessages: async () => {
    const orm = getConnection()
    try {
      const data = await orm
        .getRepository(Message)
        .createQueryBuilder()
        .limit(state.config.numLatestMessages)
        .orderBy('id', 'DESC')
        .getMany()

      const json = JSON.parse(JSON.stringify(data))
      state.recentMessages = json.map(Message.asIMessage)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  updateRecentMessages: () => {
    state.recentMessages = state.recentMessages.slice(0, state.config.numLatestMessages)
  },
  // timeout: millisecond
  banIP: (ip: string, timeout: number) => {
    const date = dayjs().add(timeout, 'milliseconds')
    state.bannedUntil[ip] = date

    setTimeout(() => delete state.bannedUntil[ip], timeout)

    // 도배방지로 자연스럽게 적용된 경우가 아닌 관리자가 채팅을 금지시킨 경우
    if (timeout > state.config.allowedChatFrequency) {
      helpers.sendMessage({
        message: {
          type: 'alert',
          text: `채팅이 금지되었습니다. (해제: ${helpers.formatWithAdd({ date })}`,
        }, ip,
      })
    }

    return state.bannedUntil[ip]
  },
}

export default {
  getters,
  actions,
}