import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../core/cache'
import hardCodedSymbols from '../constants/symbols'

const endpoints = {
  nasdaq: {
    symbols: 'https://api.stock.naver.com/stock/exchange/NASDAQ/marketValue',
    markets: 'https://polling.finance.naver.com/api/realtime/worldstock/stock/',
  },
  kospi: {
    markets: 'https://m.stock.naver.com/api/index/KOSPI/enrollStocks',
  },
}

const cache = useCache()

const marketInfoService = {
  indices: async () => {
    const stored = await cache.get('market_info:indices')
    if (stored) return stored

    let indices = {}
    try {
      const resp = await axios.get('https://coincodex.com/api/coincodex/get_metadata')
      indices = {
        btcDominance: resp['btc_dominance'],
        totalMarketCap: resp['total_market_cap'],
        basePrice: resp['fiat_rates']['KRW'],
      }
      cache.set('market_info:indices', indices, 60)
      return indices
    } catch (e) {
      return Promise.reject(e)
    }
  },
  symbols: async (forceUpdateCache?: Boolean) => {
    const stored = await cache.get('market_info:symbols')
    if (stored && !forceUpdateCache) return stored

    try {
      const result: any = await axios.get('https://api.upbit.com/v1/market/all')
      const symbols = {}

      result.forEach(o => {
        const symbol = o.market.split('KRW-')[1] || o.market.split('BTC-')[1] || o.market.split('USDT-')[1]
        if (!symbol) return

        symbols[symbol] = {
          symbol: symbol,
          thumb: `https://static.upbit.com/logos/${symbol}.png`,
          kr: o.korean_name,
          en: o.english_name,
        }
      })
      Object.keys(hardCodedSymbols).forEach(symbol => symbols[symbol] = hardCodedSymbols[symbol])
      cache.set('market_info:symbols', symbols, 60 * 5)
      return symbols
    } catch (e) {
      return Promise.reject(e)
    }
  },
  markets: async (forceUpdateCache?: Boolean) => {
    const stored = await cache.get('market_info:markets')
    if (stored && !forceUpdateCache) return stored

    try {
      const data = await Promise.all([
        axios.get('https://api.bybit.com/v2/public/symbols'),
        axios.get('https://api.binance.com/api/v1/exchangeInfo'),
      ])

      const markets = {
        bybit: data[0]['result'].map(o => o.name),
        binance: (data[1]['symbols'] || []).filter(o => o.symbol.endsWith('USDT')).map(o => o.symbol)
      }

      cache.set('market_info:markets', markets, 60 * 5)
      return markets
    } catch (e) {
      return Promise.reject(e)
    }
  },
  leaderboard: async () => {
    const stored = await cache.get('market_info:leaderboard')
    if (stored) return stored

    try {
      const { data } = await axios.get('https://api.btctools.io/api/leaderboard')
      data.sort((a, b) => b.profit - a.profit)
      data.forEach((row, idx) => row.rank = idx + 1)
      cache.set('market_info:leaderboard', data, 60)
      return data
    } catch (e) {
      return Promise.reject(e)
    }
  },
  crypto: async params => {
    try {
      const data = await axios.get('https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing', { params } )
      return data
    } catch (e) {
      return Promise.reject(e)
    }
  },
  assetsIncludingMetal: async () => {
    const stored = await cache.get('market_info:assetsIncludingMetal')
    if (stored) return stored

    try {
      const data = await axios.get('https://companiesmarketcap.com/assets-by-market-cap') as string
      const html = parse(data)
      const rows = html.getElementsByTagName('tr')
      const arr = []
      Array.from(rows).forEach((tr, idx) => {
        const o = {}
        const logo = tr.querySelector('.company-logo')
        if (!logo) return

        o['logo'] = `https://companiesmarketcap.com${logo.attributes['src']}`

        const rank = tr.querySelector('.rank-td')
        if (rank) o['rank'] = parseInt(rank.innerHTML)

        const name = tr.querySelector('.company-name')
        if (name) o['name'] = name.innerHTML

        const code = tr.querySelector('.company-code')
        if (code) o['code'] = (code.innerHTML || '').split('</span>')[1]

        const tds = Array.from(tr.getElementsByTagName('td'))
        let cap = 0
        let val = (tds[2].innerHTML || '').replace(/[$,]/g, '')
        if (val.includes('T')) cap = parseFloat(val.replace('T', '')) * Math.pow(10, 12)
        if (val.includes('B')) cap = parseFloat(val.replace('T', '')) * Math.pow(10, 9)
        if (cap) o['cap'] = cap

        const price = parseFloat((tds[3].innerHTML || '').replace(/[$T,]/g, ''))
        if (price) o['price'] = price

        const dailyChange = parseFloat((tds[4].getElementsByTagName('span')[0].innerHTML || '').replace(/[%]/g, ''))
        if (dailyChange) o['dailyChange'] = dailyChange
        arr.push(o)
      })
      cache.set('market_info:assetsIncludingMetal', arr, 60)
      return arr
    } catch (e) {
      return Promise.reject(e)
    }
  },
  nasdaq: {
    symbols: async (): Promise<Array<any>> => {
      const stored = await cache.get('market_info:nasdaq.symbols')
      if (stored) return stored

      const createPromise = (page: number) => axios.get(endpoints.nasdaq.symbols, { params: { page, pageSize: 50 } })

      try {
        const result = await Promise.all([
          createPromise(1),
          createPromise(2),
        ])
        const data = [...result[0]['stocks'], ...result[1]['stocks']].map(stock => stock.reutersCode)
        cache.set('market_info:nasdaq.symbols', data, 60 * 60)
        return data
      } catch (e) {
        return Promise.reject(e)
      }
    },
    markets: async () => {
      const stored = await cache.get('market_info:nasdaq.markets')
      if (stored) return stored

      try {
        const symbols = await marketInfoService.nasdaq.symbols()
        const resp = await axios.get(`${endpoints.nasdaq.markets}/${symbols.join(',')}`)
        const data = resp['datas']
        data.forEach((row, idx) => row.$$rank = idx + 1)
        cache.set('market_info:nasdaq.markets', data, 60)
        return data
      } catch (e) {
        return Promise.reject(e)
      }
    },
  },
  kospi: {
    markets: async (page: number) => {
      try {
        const data = await axios.get(endpoints.kospi.markets, { params: { page, pageSize: 50 } }) as any
        data.forEach((row, idx) => row.$$rank = idx + 1)
        return data
      } catch (e) {
        return Promise.reject(e)
      }
    },
  },
}

export default marketInfoService