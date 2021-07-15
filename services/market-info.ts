import axios from 'axios'

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
}

export default marketInfo