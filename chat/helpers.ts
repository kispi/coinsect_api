import store from "../store"

const mustToken = existingTokens => {
  const o = {}
  if (existingTokens) existingTokens.forEach(t => o[t] = true)

  let nonExistNewToken = ''
  for (let i = 0; i < 100; i++) {
    let token = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    if (o[token]) continue

    nonExistNewToken = token
    break
  }

  return nonExistNewToken
}

const mustJSON = {
  stringify: o => {
    let result = null
    try {
      result = JSON.stringify(o)
    } catch (e) {}
    return result
  },
  parse: o => {
    let result = null
    try {
      result = JSON.parse(o)
    } catch (e) {}
    return result
  }
}

const includesBadWords = (message: string) => {
  if (store.state.badWords.length === 0) {
    store.actions.loadBadWords()
    return
  }

  return store.state.badWords.map(o => o.word).some(badWord => message.includes(badWord))
}

export default {
  mustJSON,
  mustToken,
  includesBadWords,
}