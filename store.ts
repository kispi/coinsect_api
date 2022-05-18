import { getConnection } from 'typeorm'
import { BadWord } from './entities/bad_word'
import { BannedUser } from './entities/banned_user'
import * as dotenv from 'dotenv'

const state = {
  // save users last action timestamp to prevent too frequent DB insert.
  lastUserActions: {
    viewPost: {},
    writePost: {},
    writeReply: {},
  },
  adminToken: null, // 운영자의 토큰
  badWords: [] as Array<BadWord>,
  bannedUsers: [] as Array<BannedUser>,
  globalVariables: {
    // unit: ms
    lastUserActionTimeouts: {
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
    allowDirectPositionEdit: null,
  },
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
}

const initCaches = async () => {
  await Promise.all([
    actions.loadBadWords(),
    actions.loadBannedUsers(),
  ])
}

const store = {
  state,
  actions,
  initCaches,
}

export default store