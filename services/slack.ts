import axios from 'axios'
import store from '../store'
import { log } from '../core/logger'

const endpoint = store.state.serverConfig.SLACK_COINSECT_API

const trimmed = (text: string) => {
  if (!text) return

  return text.split('\n').map(line => line.trim()).join('\n')
}

const postMessage = async (text: string) => {
  if (!endpoint) {
    log.error('slack.postMessage: .env SLACK_COINSECT_API is missing')
    return
  }

  try {
    await axios.post(endpoint, { text: trimmed(text) })
  } catch (e) {
    return Promise.reject(e)
  }
}

export default {
  postMessage,
}