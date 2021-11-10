import { getConnection } from 'typeorm'
import { BadWord } from './entities/bad_word'
import { BannedUser } from './entities/banned_user'
import { Message } from './entities/message'
import crawlCombot from './jobs/crawl-combot'
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
  bannedUsers: [],
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
    numLatestMessages: 200,
  },
  recentMessages: [],
  serverConfig: dotenv.config().parsed,
  combotResults: [], // 임시로 사용
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
      return store.state.badWords
    } catch (e) {
      return Promise.reject(e)
    }
  },
  loadBannedUsers: async () => {
    const orm = getConnection()
    try {
      const data = await orm
        .getRepository(BannedUser)
        .createQueryBuilder()
        .getMany()
  
      const json = JSON.parse(JSON.stringify(data))
      store.state.bannedUsers = json
      return store.state.bannedUsers
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
        .limit(state.globalVariables.numLatestMessages)
        .orderBy('id', 'DESC')
        .getMany()
  
      const json = JSON.parse(JSON.stringify(data))
      store.state.recentMessages = json.map(Message.asIMessage)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  loadCombotResults: async () => {
    try {
      store.state.combotResults = await crawlCombot()
      setTimeout(store.actions.loadCombotResults, 1000 * 30)
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

const initCaches = async () => {
  await Promise.all([
    actions.loadBadWords(),
    actions.loadBannedUsers(),
    actions.loadRecentMessages(),
    actions.loadCombotResults(),
  ])
}

const store = {
  state,
  actions,
  initCaches,
}

export default store