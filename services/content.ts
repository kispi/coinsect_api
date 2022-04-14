import axios from 'axios'
import helpers from '../core/helpers'
import useCache from '../core/cache'
import { parse } from 'node-html-parser'

const cache = useCache()

const createPosition = ({ image, name }) => ({
  id: helpers.generateUUID(true),
  image,
  name,
  entryPrice: null,
  liqPrice: null,
  contract: null,
  size: null,
})

const realTimePositions = [
  createPosition({ image: 'https://coinsect-production.s3.ap-northeast-2.amazonaws.com/influencers/hodu_park.jpg', name: '박호두' }),
  createPosition({ image: 'http://stimg.afreecatv.com/LOGO/cy/cyzhgw/cyzhgw.jpg', name: '짭구' }),
  createPosition({ image: 'https://yt3.ggpht.com/ytc/AKedOLQJ_N26u5siKQw3PAr3LeY3lfJLGo4_V3G5LlYssg=s900-c-k-c0x00ffffff-no-rj', name: '사또' }),
]

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
    all: () => realTimePositions,
    set: payload => {
      if (!payload) {
        realTimePositions.push({
          id: helpers.generateUUID(true),
          image: null,
          name: null,
          liqPrice: null,
          entryPrice: null,
          contract: null,
          size: null,
        })
        return
      }

      try {
        const found = realTimePositions.find(o => o.id === payload.id)
        if (!found) realTimePositions.push(payload)
        else {
          found.image = payload.image
          found.entryPrice = parseFloat(payload.entryPrice)
          found.liqPrice = parseFloat(payload.liqPrice)
          found.size = parseFloat(payload.size)
          found.contract = payload.contract
          found.name = payload.name
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    delete: id => {
      const idx = realTimePositions.findIndex(o => o.id === id)
      if (idx >= 0) realTimePositions.splice(idx, 1)
    },
  },
}

export default contentService