import { getConnection } from 'typeorm'
import { Message } from '../entities/message'
import { IConnection, IMessage, IUser } from './types'
import profileService from '../services/profile'
import useCache from '../core/cache'
import helpers from './helpers'

const cache = useCache()

const state = {
  config: {
    numLatestMessages: 100,
    allowedChatFrequency: 500, // ms. determine how frequently users can chat
    messageMaxLength: 120,
    nicknameMaxLength: 10,
    imageUrlMaxLength: 255,
  },
  bannedUntil: {} as { ip: string },
  users: {},
  connections: [] as IConnection[],
  recentMessages: [] as Array<IMessage>,
  stats: {
    numConnections: 0,
    numBulls: 0,
    numBears: 0,
  },
}

const getters = {
  config: () => state.config,
  bannedUntil: (ip: string) => state.bannedUntil[ip],
  recentMessages: () => state.recentMessages,
  user: (token: string): IUser => state.users[token],
  users: () => state.users,
  tokens: () => state.connections.map(conn => conn.user.token),
  connections: () => state.connections,
  targetConnections: ({ ip, token }: { ip?: string, token?: string }) => state.connections.filter(conn => {
    if (ip) return conn.ip === ip
    if (token) return conn.user.token === token
  }),
  stats: () => state.stats,
}

const actions = {
  loadStats: () => {
    let numConnections = 0
    let numBulls = 0
    let numBears = 0
  
    getters.connections().forEach(conn => {
      numConnections += 1
      if (!conn.user) return
  
      const sentiment = ((getters.user(conn.user.token) || {}).profile).sentiment
      if (!sentiment) return
  
      if (sentiment.type === 'long') numBulls += 1
      if (sentiment.type === 'short') numBears += 1
    })

    state.stats.numConnections = numConnections
    state.stats.numBulls = numBulls
    state.stats.numBears = numBears
  },
  createUser: (token: string) => ({
    token,
    profile: {
      nickname: profileService.generate(),
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
  loadUsers: async () => {
    state.users = await cache.get('chat:users') || {}
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
      state.recentMessages = json.map(helpers.asIMessage)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  updateRecentMessages: () => {
    state.recentMessages = state.recentMessages.slice(0, state.config.numLatestMessages)
  },
  // timeout: millisecond
  banIP: (ip: string, timeout: number) => {
    const date = helpers.dayjs().add(timeout, 'milliseconds')
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