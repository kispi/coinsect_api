import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../../core/cache'

const cache = useCache()

const richlistService = {
  bitcoin: async () => {
    const stored = await cache.get('onchain:richlist:bitcoin')
    if (stored) return stored

    try {
      const data = await axios.get('https://bitinfocharts.com/top-100-richest-bitcoin-addresses.html') as string
      const html = parse(data)
      const table = html.querySelector('.table-condensed')
      const rows = []
      Array.from(table.querySelector('tbody').getElementsByTagName('tr')).forEach(row => {
        const cols = row.getElementsByTagName('td')
        const [addressesRatio, addressesRatioTotal] = cols[2].innerHTML.replace(/[%()]/g, '').split(' ')
        const [dominance, dominanceTotal] = cols[5].innerHTML.replace(/[%()]/g, '').split(' ')
        const o = {
          balanceBetween: cols[0].innerHTML,
          addressesNum: cols[1].innerHTML,
          addressesRatio,
          addressesRatioTotal,
          balance: cols[3].innerHTML.split(' BTC')[0].replace(/,/g, ''),
          valuationUsd: cols[4].innerHTML.replace(/[$,]/g, ''),
          dominance,
          dominanceTotal,
        }
        Object.keys(o).forEach(key => {
          const parsed = parseFloat(o[key])
          o[key] = isNaN(parsed) ? o[key] : parsed
        })
        rows.push(o)
      })
      cache.set('onchain:richlist:bitcoin', rows, 60 * 10)
      return rows
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default richlistService