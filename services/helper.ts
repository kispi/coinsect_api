import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../core/cache'
import helpers from '../core/helpers'

const cache = useCache()

let crawledUrls = []

const helperService = {
  crawledWebsites: {
    one: async (url: string) => {
      crawledUrls = await cache.get('crawled_urls') || []
      const foundIdx = crawledUrls.findIndex(o => o.url === url)
      if (foundIdx >= 0) {
        const found = crawledUrls[foundIdx]
        if (helpers.dayjs().add(1, 'hours').isAfter(found.crawledAt)) {
          crawledUrls.splice(foundIdx, 1)
        } else {
          return found
        }
      }

      try {
        const data = await axios.get(url) as string
        const html = parse(data)
        const rawMeta = html.getElementsByTagName('meta').map(o => o.attributes)
        const meta = {}
        rawMeta.forEach(t => {
          if ((t.property || '').endsWith(':image')) meta['image'] = t.content
          if ((t.property || '').endsWith(':title')) meta['title'] = t.content
          if ((t.property || '').endsWith(':description')) meta['description'] = t.content
        })
        const result = { url, meta, crawledAt: helpers.dayjs().format('YYYY-MM-DD HH:mm:ss') }
        crawledUrls.push(result)
        cache.set('crawled_urls', crawledUrls)
        return result
      } catch (e) {
        return Promise.reject(e)
      }
    },
    all: () => (cache.get('crawled_urls') || []),
  },
}

export default helperService