import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../core/cache'
import helpers from '../core/helpers'
import sites from '../constants/sites'

const cache = useCache()

let crawledUrls = {}

let crawlingUrls = {}

const removeCachedUrl = (url: string) => {
  delete crawledUrls[url]
  delete crawlingUrls[url]
}

const helperService = {
  crawledWebsites: {
    crawl: async (givenUrl: string) => {
      if (!(givenUrl || '').includes('.')) return Promise.reject({ message: 'invalid url' })

      const url = givenUrl.startsWith('http') ? givenUrl : `https://${givenUrl}`
      crawledUrls = await cache.get('crawled_urls') || {}
      const found = crawledUrls[url]
      if (found) {
        if (helpers.dayjs(found.crawledAt).add(1, 'hours').isBefore(found.crawledAt)) {
          removeCachedUrl(url)
        } else return found
      }

      // 현재 해당 URL을 크롤링중이면 요청을 받지 않는다.
      if (crawlingUrls[url]) return { url, status: 'crawling' }

      crawlingUrls[url] = true
      const meta = {}
      try {
        const data = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Slackbot 1.0; +https://api.slack.com/robots)',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US,en;q=0.8',
          },
        }) as string
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
        removeCachedUrl(url)
      }
      const result = { url, meta, crawledAt: helpers.dayjs().format(), status: 'crawled' }
      crawledUrls[url] = result
      cache.set('crawled_urls', crawledUrls)
      return result
    },
    all: async () => {
      crawledUrls = await cache.get('crawled_urls')
      return crawledUrls
    },
    examples: () => sites,
    delete: async (url: string) => {
      removeCachedUrl(url)
      cache.set('crawled_urls', crawledUrls)
      return helperService.crawledWebsites.all()
    },
  },
}

export default helperService