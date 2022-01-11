import axios from 'axios'

const cached = {
  leaderboard: null,
  indices: null,
  symbols: null,
  markets: null,
}

const marketInfoService = {
  indices: async () => {
    if (cached.indices) return cached.indices

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
      cached.indices = indices
      setTimeout(() => delete cached.indices, 1000 * 60 * 10)
      return cached.indices
    } catch (e) {
      return Promise.reject(e)
    }
  },
  symbols: async () => {
    if (cached.symbols) return cached.symbols

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

      cached.symbols = symbols
      setTimeout(() => delete cached.symbols, 1000 * 3600 * 24)
      return cached.symbols
    } catch (e) {
      return Promise.reject(e)
    }
  },
  markets: async () => {
    if (cached.markets) return cached.markets

    try {
      const data = await Promise.all([
        axios.get('https://api.bybit.com/v2/public/symbols'),
        axios.get('https://api.binance.com/api/v1/exchangeInfo'),
      ])

      cached.markets = {
        bybit: data[0]['result'].map(o => o.name),
        binance: (data[1]['symbols'] || []).filter(o => o.symbol.endsWith('USDT')).map(o => o.symbol)
      }
      setTimeout(() => delete cached.markets, 1000 * 60 * 5)
      return cached.markets
    } catch (e) {
      return Promise.reject(e)
    }
  },
  leaderboard: async () => {
    if (cached.leaderboard) return cached.leaderboard

    try {
      const { data } = await axios.get('https://api.btctools.io/api/leaderboard')
      cached.leaderboard = data
      data.sort((a, b) => b.profit - a.profit)
      data.forEach((row, idx) => row.rank = idx + 1)
      setTimeout(() => delete cached.leaderboard, 1000 * 60)
      return cached.leaderboard
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default marketInfoService