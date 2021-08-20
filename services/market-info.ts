import axios from 'axios'

const cached = {
  leaderboard: null,
  markets: null,
}

const marketInfo = {
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
      ])
      cached.markets = {
        upbit: data[0],
        bybit: data[1]['result'].map(o => o.name),
        bithumb: Object.keys(data[2]['data']),
      }
      setInterval(() => delete cached.markets, 1000 * 3600)
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
      setInterval(() => delete cached.leaderboard, 1000 * 60)
      return cached.leaderboard
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default marketInfo