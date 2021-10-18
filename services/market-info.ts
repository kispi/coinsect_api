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
      const result: any = await Promise.all([
        axios.get('https://api.upbit.com/v1/market/all'),
        axios.get('https://api.coingecko.com/api/v3/search?locale=en'),
      ])
      const symbols = {}
      result[0].forEach(o => {
        const symbol = o.market.split('KRW-')[1] || o.market.split('BTC-')[1] || o.market.split('USDT-')[1]
        if (!symbol) return

        symbols[symbol] = {
          symbol: symbol,
          thumb: `https://static.upbit.com/logos/${symbol}.png`,
          kr: o.korean_name,
          en: o.english_name,
        }
      })
      result[1]['coins'].forEach(coin => {
        if (symbols[coin.symbol] && symbols[coin.symbol].en) return

        symbols[coin.symbol] = {
          symbol: coin.symbol,
          thumb: coin.thumb,
          en: coin.name,
        }
      })
      cached.symbols = symbols
      setTimeout(() => delete cached.symbols, 1000 * 3600 * 24)
      return cached.symbols
    } catch (e) {
      return Promise.reject(e)
    }
  },
  marketcaps: async source => {
    const endpoint = source === 'upbit' ? 
      'https://crix-api-cdn.upbit.com/v1/crix/marketcap?currency=KRW' :
      'https://cryprice.com/coinmarketcapjson'
    try {
      const resp = await axios.get(endpoint)
      return resp.data ? resp.data : resp
    } catch (e) {
      return Promise.reject(e)
    }
  },
  markets: async () => {
    if (cached.markets) return cached.markets

    try {
      const data = await Promise.all([
        axios.get('https://api.upbit.com/v1/market/all'),
        axios.get('https://api.bybit.com/v2/public/symbols'),
        axios.get('https://api.bithumb.com/public/ticker/all_krw'),
        axios.get('https://api.binance.com/api/v1/exchangeInfo'),
      ])
      cached.markets = {
        upbit: data[0],
        bybit: data[1]['result'].map(o => o.name),
        bithumb: Object.keys(data[2]['data']).filter(symbol => symbol !== 'date').map(symbol => ({
          symbol,
          ...data[2]['data'][symbol]
        })),
        binance: (data[3]['symbols'] || []).filter(o => o.symbol.endsWith('USDT')).map(o => o.symbol),
      }
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