import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../core/cache'

const cache = useCache()

const helperService = {
  crawlMetaTags: async (url: string) => {
    const key = `crawled_url:${url}`
    const stored = await cache.get(key)
    if (stored) return stored

    try {
      const data = await axios.get(url) as string
      const html = parse(data)
      const metaTags = html.getElementsByTagName('meta').map(o => o.attributes)
      cache.set(key, metaTags, 60 * 60)
      return metaTags
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default helperService