import { getConnection } from "typeorm"
import { BadWord } from "./entities/bad_word"

const state = {
  // 너무 단시간에 많은 채팅을 치는 것을 막기 위해 이 객체에 IP가 있는 동안은 broadcast를 막는다.
  preventSpam: {
    timeout: 200,
    IPAddresses: {},
  },
  badWords: [],
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