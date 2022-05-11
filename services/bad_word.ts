import store from '../store'

export default {
  includedIn: (message: string) => store.state.badWords.map(o => o.word).some(badWord => message.includes(badWord)),
  filtered: (message: string) => {
    let filtered = message
    store.state.badWords.forEach(badWord => filtered = filtered.replace(badWord.word, badWord.alternative))
    return filtered
  },
}