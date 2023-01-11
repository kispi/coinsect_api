import axios from 'axios'
import helpers from '../../core/helpers'
import useCache from '../../core/cache'
import { parse } from 'node-html-parser'

const cache = useCache()

const foo = (val: string) => parseFloat(val.replace(/[^.0-9]+/g, ''))

const publicTreasuryService = {
  all: async () => {
    const stored = await cache.get('content:publicTreasuries')
    if (stored) return stored

    try {
      const result = []
      const data = await axios.get('https://bitcointreasuries.net') as string
      const html = parse(data)
      const rows = html.getElementsByTagName('tr')

      let type = 'Public Company'
      // 첫줄은 각 열에 대한 설명이라 생략
      rows.slice(1).forEach(row => {
        const th = row.getElementsByTagName('th')
        if (th[0]) {
          type = th[0].innerHTML
          return
        }

        const cols = row.getElementsByTagName('td')
        if (cols.length !== 10) return

        const spansInNameCell = cols[0].querySelectorAll('span')
        const item = {
          name: helpers.sanitize.strict(spansInNameCell[spansInNameCell.length - 1].innerText.trim()),
          symbol: helpers.sanitize.strict(cols[1].innerHTML),
          costBasis: foo(cols[5].innerText) * Math.pow(10, 6),
          valuation: foo(cols[6].innerText) * Math.pow(10, 6),
          holdings: foo(cols[4].innerText),
          type,
        }
        item['dominance'] = Math.round(10000 * item.holdings / 210000) / 10000
        if (item.symbol === 'TSLA') item.name = 'Tesla, Inc.'

        if (item.costBasis && item.valuation && item.holdings) {
          item['profit'] = Math.round(10000 * (item.valuation - item.costBasis) / item.costBasis) / 100
          item['avgPrice'] = Math.round(item.costBasis / item.holdings)
        }
        result.push(item)
      })
      cache.set('content:publicTreasuries', result, 3600)
      return result
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

export default publicTreasuryService