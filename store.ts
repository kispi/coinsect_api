import { dataSource } from './database'
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
      profileImageUrl: 255, // varchar(255)
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
    try {
      const data = await dataSource
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
    try {
      const data = await dataSource
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

const store = {
  state,
  actions,
}

export default store