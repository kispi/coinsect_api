import { createClient } from 'redis'
import { log } from './logger'
import store from '../store'

let usedClient

const c = store.state.serverConfig

const useCache = () => {
  const client = usedClient || createClient({
    socket: {
      host: c.REDIS_HOST,
      port: parseInt(c.REDIS_PORT),
    },
    password: c.REDIS_PASSWORD,
  })

  if (!usedClient) {
    client.on('error', err => log.error('Redis Client Error', err))

    client.connect()

    usedClient = client
  }

  return {
    get: async (key: string) => {
      const raw = await client.get(key)
      return JSON.parse(raw)
    },
    set: (key: string, value: any, seconds?: number) => {
      if (seconds) return client.setEx(key, seconds, JSON.stringify(value))

      return client.set(key, JSON.stringify(value))
    },
    del: (key: string) => client.del(key),
  }
}

export default useCache