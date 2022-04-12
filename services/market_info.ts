import axios from 'axios'
import useCache from '../core/cache'

const cache = useCache()

const marketInfoService = {
  indices: async () => {
    const stored = await cache.get('market_info:indices')
    if (stored) return stored

    let indices = {}
    try {
      const resp = await Promise.all([
        axios.get('https://coincodex.com/api/coincodex/get_metadata'),
        axios.get('https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD'),
      ])

      indices = {
        btcDominance: resp[0]['btc_dominance'],
        btcDominance24hChangePercent: resp[0]['btc_dominance_24h_change_percent'],
        totalMarketCap: resp[0]['total_market_cap'],
        totalMarketCap24hChangePercent: resp[0]['total_market_cap_24h_change_percent'],
        totalVolume: resp[0]['total_volume'],
        totalVolume24hChangePercent: resp[0]['total_volume_24h_change_percent'],
        basePrice: resp[1][0]['basePrice'],
        signedChangeRate: resp[1][0]['signedChangeRate'],
      }
      cache.set('market_info:indices', indices, 60 * 10)
      return indices
    } catch (e) {
      return Promise.reject(e)
    }
  },
  symbols: async () => {
    const stored = await cache.get('market_info:symbols')
    if (stored) return stored

    try {
      const result = await Promise.allSettled([
        axios.get('https://api.upbit.com/v1/market/all'),
        axios.get('https://api.coingecko.com/api/v3/search?locale=en'),
      ])

      const symbols = {}

      if (result[0].status === 'fulfilled') {
        const v: any = result[0].value
        v.forEach(o => {
          const symbol = o.market.split('KRW-')[1] || o.market.split('BTC-')[1] || o.market.split('USDT-')[1]
          if (!symbol) return
  
          symbols[symbol] = {
            symbol: symbol,
            thumb: `https://static.upbit.com/logos/${symbol}.png`,
            kr: o.korean_name,
            en: o.english_name,
          }
        })
      }

      if (result[1].status === 'fulfilled') {
        result[1].value['coins'].forEach(coin => {
          if (symbols[coin.symbol] && symbols[coin.symbol].en) return
  
          symbols[coin.symbol] = {
            symbol: coin.symbol,
            thumb: coin.thumb,
            en: coin.name,
          }
        })
      }
      cache.set('market_info:symbols', symbols, 3600 * 24)
      return symbols
    } catch (e) {
      return Promise.reject(e)
    }
  },
  markets: async () => {
    const stored = await cache.get('market_info:markets')
    if (stored) return stored

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
}

export default marketInfoService