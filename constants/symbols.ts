import helpers from '../core/helpers'

const arr = [
  { symbol: 'USDT', kr: '테더', en: 'Tether' },
  { symbol: 'BNB', kr: '바이낸스 코인', en: 'Binance Coin' },
  { symbol: 'BUSD', kr: '바이낸스 USD', en: 'Binance USD' },
  { symbol: 'USDC', kr: 'USD 코인', en: 'USD Coin' },
  { symbol: 'WBTC', kr: '랩드 비트코인', en: 'Wrapped Bitcoin' },
  { symbol: 'KLAY', kr: '클레이튼', en: 'Klaytn' },
  { symbol: 'GUSD', kr: '제미니 USD', en: 'Gemini USD' },
  { symbol: 'PAX', kr: '팩소스 스탠다드', en: 'Paxos Standard' },
  { symbol: 'YFI', kr: '연 파이낸스', en: 'Yearn Finance' },
]

const o = {}
arr.forEach(item => o[item.symbol] = {
  symbol: item.symbol,
  kr: item.kr,
  en: item.en,
  thumb: helpers.useCdn(`images/symbols/${item.symbol}.png`)
})
export default o