import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../core/cache'
import helpers from '../core/helpers'
import sites from '../constants/sites'

const cache = useCache()

let crawledUrls = []

let crawlingUrls = {}

const removeCachedUrl = (url: string) => {
  const idx = crawledUrls.findIndex(o => o.url === url)
  if (idx < 0) return

  crawledUrls.splice(idx, 1)
  removeCachedUrl(url)
}

const helperService = {
  crawledWebsites: {
    one: async (givenUrl: string) => {
      if (!(givenUrl || '').includes('.')) return Promise.reject({ message: 'invalid url' })

      const url = givenUrl.startsWith('http') ? givenUrl : `https://${givenUrl}`
      crawledUrls = await cache.get('crawled_urls') || []
      const foundIdx = crawledUrls.findIndex(o => o.url === url)
      if (foundIdx >= 0) {
        const found = crawledUrls[foundIdx]
        if (helpers.dayjs(found.crawledAt).add(1, 'hours').isBefore(found.crawledAt)) {
          removeCachedUrl(url)
        } else return found
      }

      // 현재 해당 URL을 크롤링중이면 요청을 받지 않는다.
      if (crawlingUrls[url]) return { url, status: 'crawling' }

      crawlingUrls[url] = true
      const meta = {}
      try {
        const data = await axios.get(url) as string
        const html = parse(data)
        const rawMeta = html.getElementsByTagName('meta').map(o => o.attributes)
        rawMeta.forEach(t => {
          if (!t.content) return

          const key = t.property || t.name || t.itemprop || ''
          if (key.endsWith('image')) meta['image'] = (t.content || '').startsWith('http') ? t.content : `${url}${t.content}`
          if (key.endsWith('title')) meta['title'] = t.content
          if (key.endsWith('description')) meta['description'] = t.content
        })
      } catch (e) {
        return Promise.reject(e)
      } finally {
        delete crawlingUrls[url]
      }
      const result = { url, meta, crawledAt: helpers.dayjs().format('YYYY-MM-DD HH:mm:ss'), status: 'crawled' }
      crawledUrls.push(result)
      cache.set('crawled_urls', crawledUrls)
      return result
    },
    all: () => (cache.get('crawled_urls') || []),
    examples: () => sites,
  },
}

export default helperService