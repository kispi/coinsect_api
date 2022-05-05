import axios from 'axios'
import helpers from '../core/helpers'
import useCache from '../core/cache'
import presets from './positions-presets'
import { parse } from 'node-html-parser'

type IPosition = {
  id: string
  name: string
  link: string
  image: string
  contract: string
  entryPrice: number
  liqPrice: number
  size: number
}

const cache = useCache()

const createPosition = ({
  image,
  name,
  link,
}: {
  image: string,
  name: string,
  link?: string,
}): IPosition => ({
  id: helpers.generateUUID(true),
  image,
  name,
  entryPrice: null,
  liqPrice: null,
  contract: 'BTCUSDT',
  size: null,
  link,
})

let realTimePositions = {
  data: presets.map(createPosition),
  lastUpdate: null,
}

const setRealTimePositions = o => {
  o.lastUpdate = helpers.dayjs().format()
  cache.set('content:realTimePositions', o)
}

const foo = (val: string) => parseFloat(val.replace(/[^.0-9]+/g, ''))

const contentService = {
  publicTreasuries: async () => {
    const stored = await cache.get('content:publicTreasuries')
    if (stored) return stored

    try {
      const result = []
      const data = await axios.get('https://docs.google.com/spreadsheets/u/0/d/e/2PACX-1vQHcNgqvu0l1S-aBE12KEooSK9CQlw7LrKA2M9ZToRMw4f5DM31TOvexQOIPu32lf0TLhVSpHJMCxdT/pubhtml/sheet?headers=false&gid=0') as string
      const html = parse(data)
      const rows = html.getElementsByTagName('tr')
      rows.forEach(row => {
        const cols = row.getElementsByTagName('td')
        if (cols.length < 12) return

        let source = helpers.parseHref(cols[6].innerHTML)
        if (source) {
          source = source.split('https://www.google.com/url?q=')[1]
          source = source.split('&amp;sa=D')[0]
        }

        const item = {
          name: helpers.sanitize.strict(cols[1].innerHTML),
          country: helpers.sanitize.strict(cols[2].innerHTML),
          symbol: helpers.sanitize.strict(cols[3].innerHTML),
          source,
          costBasis: foo(cols[7].innerHTML),
          valuation: foo(cols[8].innerHTML),
          holdings: foo(cols[10].innerHTML),
          type: 'etc',
        }
        item['dominance'] = Math.round(10000 * item.holdings / 210000) / 10000

        if (item.costBasis && item.valuation && item.holdings) {
          item['profit'] = Math.round(10000 * (item.valuation - item.costBasis) / item.costBasis) / 100
          item['avgPrice'] = Math.round(item.costBasis / item.holdings)
          if (item['profit'] === 0) item['type'] = 'etf'
          else item['type'] = 'public_company'
        }
        if ((item['symbol'] === 'gov')) item['type'] = 'gov'
        if ((item['symbol'] === 'private')) item['type'] = 'private_company'
        result.push(item)
      })
      result.sort((a, b) => b.holdings - a.holdings)
      cache.set('content:publicTreasuries', result, 3600)
      return result
    } catch (e) {
      return Promise.reject(e)
    }
  },
  realTimePositions: {
    presets: () => presets,
    validate: async payload => {
      if (
        (payload.liqPrice && isNaN(parseFloat(payload.liqPrice))) ||
        (payload.entryPrice && isNaN(parseFloat(payload.entryPrice))) ||
        (payload.size && isNaN(parseFloat(payload.size)))
      ) throw { message: '진입가, 청산가, 규모는 숫자여야 합니다.' }

      if ((payload.name || '').length > 10) throw { message: '스트리머 이름은 10자 미만으로 적어주세요' }
      if ((payload.image || '').length > 300) throw { message: '300자 미만의 이미지 URL을 사용해주세요' }
      if ((payload.link || '').length > 200) throw { message: '200자 미만의 방송플랫폼 URL을 사용해주세요' }
      if (payload.contract && !payload.contract.endsWith('USDT')) throw { message: '계약은 반드시 USDT로 끝나야 합니다' }
    },
    all: async () => {
      const stored: any = await cache.get('content:realTimePositions')
      if (stored) realTimePositions = stored
      return realTimePositions
    },
    set: async payload => {
      if (!payload) {
        realTimePositions.data.push({
          id: helpers.generateUUID(true),
          image: null,
          name: null,
          liqPrice: null,
          entryPrice: null,
          contract: 'BTCUSDT',
          size: null,
          link: null,
        })
        setRealTimePositions(realTimePositions)
        return
      }

      try {
        await contentService.realTimePositions.validate(payload)

        if (!payload.id) payload.id = helpers.generateUUID(true)

        const found = realTimePositions.data.find(o => o.id === payload.id)
        if (!found) realTimePositions.data.push(createPosition(payload))
        else {
          found.image = (payload.image || '').trim()
          payload.entryPrice ? found.entryPrice = parseFloat(payload.entryPrice) : delete found.entryPrice
          payload.liqPrice ? found.liqPrice = parseFloat(payload.liqPrice) : delete found.liqPrice
          payload.size ? found.size = parseFloat(payload.size) : delete found.size
          found.contract = (payload.contract || '').trim()
          found.name = (payload.name || '').trim()
          found.link = (payload.link || '').trim()
        }
        setRealTimePositions(realTimePositions)
      } catch (e) {
        return Promise.reject(e)
      }
    },
    delete: async id => {
      const idx = realTimePositions.data.findIndex(o => o.id === id)
      if (idx >= 0) realTimePositions.data.splice(idx, 1)
      setRealTimePositions(realTimePositions)
    },
  },
  news: {
    coinness: {
      feeds: (lastId: number) => axios.get('https://api.coinness.live/feed/v1/news', { params: { lastId } }),
      articles: ({
        limit = 10,
        section = 'latest',
        lastId,
      }: ({
        limit?: number,
        section?: 'latest' | 'popularity',
        lastId?: number,
      })) => axios.get('https://api.coinness.live/feed/v1/articles', {
        params: {
          limit,
          section,
          lastId,
        },
      }),
    },
  },
}

export default contentService