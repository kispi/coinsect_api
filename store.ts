import { getConnection } from 'typeorm'
import { BadWord } from './entities/bad_word'
import { Message } from './entities/message'
import * as dotenv from 'dotenv'

const state = {
  // save users last action timestamp to prevent too frequent DB insert.
  lastUserActions: {
    message: {},
    viewPost: {},
    writePost: {},
    writeReply: {},
  },
  badWords: [],
  globalVariables: {
    // unit: ms
    lastUserActionTimeouts: {
      message: 200,
      viewPost: 1000 * 60,
      writePost: 1000 * 10,
      writeReply: 1000 * 10,
    },
    maxlength: {
      nickname: 10,
      postTitle: 40,
      replyContent: 1000,
    },
    version: {
      frontend: null,
      backend: null,
    },
  },
  recentMessages: [],
  serverConfig: dotenv.config().parsed,
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
      setTimeout(store.actions.loadBadWords, 1000 * 60)
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