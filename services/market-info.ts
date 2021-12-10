import axios from 'axios'

const cached = {
  leaderboard: null,
  symbols: null,
  markets: null,
}

const marketInfoService = {
  indices: async () => {
    try {
      const resp = await Promise.all([
        axios.get('https://coincodex.com/api/coincodex/get_metadata'),
        axios.get('https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD'),
      ])
      return {
        coincodex: resp[0],
        upbitForex: resp[1][0],
      }
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
        result[1].value['coins'].slice(0, 3000).forEach(coin => {
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
      const data = await Promise.allSettled([
        axios.get('https://api.upbit.com/v1/market/all'),
        axios.get('https://api.bybit.com/v2/public/symbols'),
        axios.get('https://api.bithumb.com/public/ticker/all_krw'),
        axios.get('https://api.binance.com/api/v1/exchangeInfo'),
      ])

      cached.markets = {}

      if (data[0].status === 'fulfilled') cached.markets.upbit = data[0].value

      if (data[1].status === 'fulfilled') cached.markets.bybit = data[1].value['result'].map(o => o.name)

      if (data[2].status === 'fulfilled') {
        const v = data[2].value
        cached.markets.bithumb = Object.keys(v['data']).filter(symbol => symbol !== 'date').map(symbol => ({
          symbol,
          ...v['data'][symbol]
        }))
      }

      if (data[3].status === 'fulfilled') cached.markets.binance = (data[3].value['symbols'] || []).filter(o => o.symbol.endsWith('USDT')).map(o => o.symbol)

      setTimeout(() => delete cached.markets, 1000 * 3600)
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