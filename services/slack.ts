import axios from 'axios'
import store from '../store'
import { log } from '../core/logger'

const endpoint = store.state.serverConfig.SLACK

const trimmed = (text: string) => {
  if (!text) return

  return text.split('\n').map(line => line.trim()).join('\n').trim()
}

const postMessage = async (text: string) => {
  if (!endpoint) {
    log.error('slack.postMessage: .env SLACK is missing')
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