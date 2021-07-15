import axios from 'axios'

const marketInfo = {
  indices: () => {
    return {
      usdKrw: 1150.5,
      dominance: {
        btc: 45.88,
        eth: 18.22,
      },
      totalMarketCap: 1321134065546,
      vol24: 60732991279,
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
}

export default marketInfo