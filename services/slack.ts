import axios from 'axios'
import store from '../store'
import helpers from '../core/helpers'
import { log } from '../core/logger'

const endpoint = store.state.serverConfig.SLACK

const postMessage = async (text: string) => {
  if (!endpoint) {
    log.error('slack.postMessage: .env SLACK is missing')
    return
  }

  try {
    await axios.post(endpoint, { text: helpers.allNewlineTrimmed(text) })
  } catch (e) {
    return Promise.reject(e)
  }
}

export default {
  postMessage,
}