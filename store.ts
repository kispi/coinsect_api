import { getConnection } from 'typeorm'
import { BadWord } from './entities/bad_word'
import { Message } from './entities/message'

const state = {
  // 너무 단시간에 많은 채팅을 치는 것을 막기 위해 이 객체에 IP가 있는 동안은 broadcast를 막는다.
  preventSpam: {
    IPAddresses: {},
  },
  badWords: [],
  globalVariables: {
    chatFrequency: 200,
  },
  recentMessages: [],
}

const actions = {
  loadBadWords: async () => {
    const orm = getConnection()
    try {
      const data = await orm
        .getRepository(BadWord)
        .createQueryBuilder()
        .getMany()
  
      const json = JSON.parse(JSON.stringify(data))
      store.state.badWords = json
      setTimeout(() => store.state.badWords = [], 1000 * 60 * 60)
      return store.state.badWords
    } catch (e) {
      return Promise.reject(e)
    }
  },
  loadRecentMessages: async () => {
    const orm = getConnection()
    try {
      const data = await orm
        .getRepository(Message)
        .createQueryBuilder()
        .limit(200)
        .orderBy('id', 'DESC')
        .getMany()
  
      const json = JSON.parse(JSON.stringify(data))
      store.state.recentMessages = json.map(o => ({
        type: o.type,
        text: o.text,
        ts: o.ts,
        numConnections: o.numConnections,
        user: {
          token: o.token,
          profile: {
            nickname: o.nickname,
            image: o.image,
          },
        },
      })).reverse()
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

const store = {
  state,
  actions,
}

export default store