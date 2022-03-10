import axios from 'axios'
import helpers from '../core/helpers'
import sanitize from '../core/helpers/sanitize'
import { parse } from 'node-html-parser'

const cached = {
  publicTreasuries: null,
  realTimePositions: [
    // { id: SHARING_KEY, personId: 17, name: '박호두', entry: 42101, contract: 'BTCUSDT', size: -5 },
  ],
}

const foo = (val: string) => parseFloat(val.replace(/[^.0-9]+/g, ''))

const contentService = {
  publicTreasuries: async () => {
    if (cached.publicTreasuries) return cached.publicTreasuries

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
          name: sanitize.strict(cols[1].innerHTML),
          country: sanitize.strict(cols[2].innerHTML),
          symbol: sanitize.strict(cols[3].innerHTML),
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
      cached.publicTreasuries = result
      setTimeout(() => delete cached.publicTreasuries, 1000 * 60 * 60)
      return cached.publicTreasuries
    } catch (e) {
      return Promise.reject(e)
    }
  },
  realTimePositions: {
    all: () => cached.realTimePositions,
    set: payload => {
      if (!payload) {
        cached.realTimePositions.push({
          id: helpers.generateUUID(true),
          personId: null,
          name: null,
          entry: null,
          contract: null,
          size: null,
        })
        return
      }

      try {
        const found = cached.realTimePositions.find(o => o.id === payload.id)
        if (!found) cached.realTimePositions.push(payload)
        else {
          found.personId = parseInt(payload.personId)
          found.entry = parseInt(payload.entry)
          found.size = parseInt(payload.size)
          found.contract = payload.contract
          found.name = payload.name
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    delete: id => {
      const idx = cached.realTimePositions.findIndex(o => o.id === id)
      if (idx >= 0) cached.realTimePositions.splice(idx, 1)
    },
  },
}

export default contentService