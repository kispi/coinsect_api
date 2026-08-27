import axios from 'axios'
import parse from 'node-html-parser'
import useCache from '../core/cache'
import hardCodedSymbols from '../constants/symbols'
import caseHelpers from '../core/helpers/case'
import { log } from '../core/logger'

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

const INDICES_CACHE_KEY = 'market_info:indices'
// indices가 비면 프론트의 usdKrw가 0이 되고, 그 순간 김프 계산(calculateKimp)과 메인 카드의
// 업비트 가격 표시가 통째로 사라진다. 원천이 잠깐 죽어도 화면이 비지 않도록 마지막 성공값을
// 따로 길게 남겨두고 폴백으로 쓴다.
const INDICES_LAST_GOOD_CACHE_KEY = 'market_info:indices:last_good'
const INDICES_LAST_GOOD_TTL = 60 * 60 * 24

// 원래 원천이던 coincodex의 get_metadata가 응답을 멈추면서(그쪽 Varnish가 계속 503) basePrice가
// 사라졌고, 그게 프론트의 김프/업비트 가격이 안 뜨는 원인이었다. coingecko의 global 하나면
// 도미넌스·총 시총·원달러 환율을 다 얻을 수 있어 그쪽으로 옮긴다
// (coingecko는 services/wallet.ts에서도 이미 쓰는 원천이다).
// 주의: server_modules.ts의 axios 응답 인터셉터가 res.data를 벗겨주므로 아래 ['data']는
// coingecko 응답 본문의 data 필드다.
const fetchIndices = async () => {
  const data = await axios.get('https://api.coingecko.com/api/v3/global').then(body => body['data'])
  const totalMarketCap = Number(data?.['total_market_cap']?.['usd'])
  const totalMarketCapKrw = Number(data?.['total_market_cap']?.['krw'])
  const btcDominance = Number(data?.['market_cap_percentage']?.['btc'])
  // coingecko가 같은 시총을 통화별로 환산해 주므로 krw/usd 비율이 곧 원달러 환율이다.
  const basePrice = totalMarketCapKrw / totalMarketCap

  if (![totalMarketCap, btcDominance, basePrice].every(v => Number.isFinite(v) && v > 0)) {
    throw new Error('market_info.indices: unexpected payload from coingecko')
  }

  return { btcDominance, totalMarketCap, basePrice }
}

const marketInfoService = {
  indices: async () => {
    const stored = await cache.get(INDICES_CACHE_KEY)
    if (stored) return stored

    try {
      const indices = await fetchIndices()
      cache.set(INDICES_CACHE_KEY, indices, 60)
      cache.set(INDICES_LAST_GOOD_CACHE_KEY, indices, INDICES_LAST_GOOD_TTL)
      return indices
    } catch (e) {
      const lastGood = await cache.get(INDICES_LAST_GOOD_CACHE_KEY)
      if (lastGood) {
        log.error('market_info.indices: upstream failed, serving last known good value')
        return lastGood
      }

      // 인터셉터가 던지는 axios response를 그대로 올려보내면 순환 참조라 fastify가 직렬화에
      // 실패해 "Converting circular structure to JSON" 503으로 새어나간다.
      return Promise.reject(new Error('market_info.indices: failed to load indices'))
    }
  },
  symbols: async (forceUpdateCache?: Boolean) => {
    const stored = await cache.get('market_info:symbols')
    if (stored && !forceUpdateCache) return stored

    try {
      const result: any = await axios.get('https://api.upbit.com/v1/market/all')
      const symbols = {}

      result.push({ korean_name: '라이트코인', english_name: 'Litecoin', market: 'KRW-LTC' })
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
        axios.get('https://api.bybit.com/v5/market/tickers?category=linear'),
        axios.get('https://api.binance.com/api/v1/exchangeInfo'),
      ])

      const markets = {
        bybit: data[0]['result']['list'].map(o => o.symbol),
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
  // coinmarketcap은 본문(cryptoCurrencyList, cmcRank...)은 camelCase로 주면서 status 봉투만
  // credit_count/error_code/error_message로 준다. 중계하는 쪽에서 표기를 통일해 내보낸다.
  crypto: async params => {
    try {
      const data = await axios.get('https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing', { params } )
      return caseHelpers.keysToCamel(data)
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