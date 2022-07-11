import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../../core/cache'

const cache = useCache()

const useBitinfoCharts = async ({
  url,
  symbol,
  cacheKey,
}: {
  url: string,
  symbol: string,
  cacheKey: string,
}) => {
  const stored = await cache.get(cacheKey)
  if (stored) return stored

  try {
    const data = await axios.get(url) as string
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
        balance: cols[3].innerHTML.split(` ${symbol}`)[0].replace(/,/g, ''),
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
    cache.set(cacheKey, { data: rows, link: url }, 60 * 10)
    return rows
  } catch (e) {
    return Promise.reject(e)
  }
}

const richlistService = {
  bitcoin: () => useBitinfoCharts({
    url: 'https://bitinfocharts.com/top-100-richest-bitcoin-addresses.html',
    symbol: 'BTC',
    cacheKey: 'onchain:richlist:bitcoin',
  }),
  bitcoinCash: () => useBitinfoCharts({
    url: 'https://bitinfocharts.com/top-100-richest-bitcoin%20cash-addresses.html',
    symbol: 'BCH',
    cacheKey: 'onchain:richlist:bitcoinCash',
  }),
  dogecoin: () => useBitinfoCharts({
    url: 'https://bitinfocharts.com/top-100-richest-dogecoin-addresses.html',
    symbol: 'DOGE',
    cacheKey: 'onchain:richlist:dogecoin',
  }),
  litecoin: () => useBitinfoCharts({
    url: 'https://bitinfocharts.com/top-100-richest-litecoin-addresses.html',
    symbol: 'LTC',
    cacheKey: 'onchain:richlist:litecoin',
  }),
}

export default richlistService