import store from '../store'

export default {
  includedIn: (message: string) => store.state.badWords.map(o => o.word).some(badWord => message.includes(badWord)),
  filtered: (message: string) => {
    let filtered = message
    store.state.badWords.forEach(badWord => {
      const regex = new RegExp(badWord.word, 'gi')
      filtered = filtered.replace(regex, badWord.alternative || '*'.repeat(badWord.word.length))
    })
    return filtered
  },
}