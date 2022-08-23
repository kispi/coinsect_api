import { createClient, RedisClientType } from 'redis'
import { log } from './logger'
import ICacheClient from './interfaces/cache_client'
import store from '../store'

const localState = {}

const localCacheClient: ICacheClient = {
  set: (key: string, value: unknown, seconds?: number) => {
    localState[key] = value
    if (seconds) setTimeout(() => localCacheClient.del(key), seconds * 1000)
  },
  get: (key: string) => localState[key],
  del: (key: string) => delete localState[key],
}

let usedClient

const useCache = (): ICacheClient => {
  if (store.state.serverConfig.USE_REDIS !== 'yes') return localCacheClient

  const client: RedisClientType = usedClient || createClient({ url: 'redis://localhost:6379' })

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
    set: (key: string, value: unknown, seconds?: number) => {
      if (seconds) return client.setEx(key, seconds, JSON.stringify(value))

      return client.set(key, JSON.stringify(value))
    },
    del: (key: string) => client.del(key),
  }
}

export default useCache