import store from '../store'

const badWordService = {
  nonAlphabetExcluded: (message: string) => {
    return message.replace(/[!@#$%^&*()0-9]/ig, '')
  },
  includedIn: (message: string) => {
    return store.state.badWords.some(badWord =>
      ((badWord.word || '').split('/') || []).some(token => message.includes(token))
    )
  },
  filtered: (message: string) => {
    let filtered = badWordService.nonAlphabetExcluded(message)
    if (!badWordService.includedIn(filtered)) return message

    store.state.badWords.forEach(badWord =>
      ((badWord.word || '').split('/') || []).forEach(token => {
        filtered = filtered.replace(new RegExp(token, 'ig'), badWord.alternative || '*'.repeat(badWord.word.length))
      })
    )
    return filtered
  },
}

export default badWordService