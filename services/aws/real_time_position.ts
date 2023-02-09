import { DetectTextResponse, TextDetectionList } from 'aws-sdk/clients/rekognition'
import rekognitionService from './rekognition'

type ISimplePosition = {
  contract: string
  entryPrice: number
  liqPrice: number
  size: number
}

const asFloat = (stringNumber: string) => parseFloat((stringNumber || '').replace(/,/g, ''))

// 바이빗, 비트겟 등의 거래소 화면을 찍은 스크린샷에서 추출된 레이블들의 텍스트와 그 위치를 분석하여 값을 추출한다.
const exchangeAnalyzer = {
  bybit: (json: TextDetectionList): ISimplePosition => {
    const o = {} as ISimplePosition
    const pos = {}

    json.forEach(word => {
      if (['Contracts', 'Qty', 'Entry Price', 'Liq. Price'].some(item => (word.DetectedText || '').startsWith(item))) {
        pos[word.DetectedText] = {
          Left: word.Geometry.BoundingBox.Left,
          Top: word.Geometry.BoundingBox.Top,
        }
      }
    })

    json.forEach(word => {
      Object.keys(pos).forEach(key => {
        if (
          key === word.DetectedText ||
          Math.abs(word.Geometry.BoundingBox.Left - pos[key].Left) >= 0.1 || // 거리상 맞는 항목일 확률이 낮음
          word.Geometry.BoundingBox.Top - pos[key].Top < 0                    // 어떤 항목인지 타이틀이 더 위에 표기되어야 함.
        ) return

        if (key === 'Contracts' && word.DetectedText.endsWith('USDT')) o.contract = word.DetectedText
        if (key === 'Liq. Price') o.liqPrice = asFloat(word.DetectedText)
        if (key === 'Entry Price') o.entryPrice = asFloat(word.DetectedText)
        if (key === 'Qty') o.size = asFloat(word.DetectedText)
      })
    })
    return o
  },
  bitget: (json: TextDetectionList): ISimplePosition => {
    const o = {} as ISimplePosition
    let direction
    json.forEach(word => {
      const s = word.DetectedText || ''
      if (s.startsWith('Open Price')) {
        o.entryPrice = asFloat(s.split(' ')[2])
      }
      if (s.startsWith('Estimated deleverage price')) {
        o.liqPrice = asFloat(s.split(' ')[3])
      }
      if (s.startsWith('Position')) {
        const possibleSize = asFloat(s.split(' ')[1])
        if (possibleSize) o.size = possibleSize
      }
      if (
        (s.startsWith('Long') || s.startsWith('Short')) &&
        s.endsWith('USDT')
      ) {
        const tokens = s.split(' ')
        o.contract = tokens[tokens.length - 1]
        if (s.startsWith('Long')) direction = 'long'
        if (s.startsWith('Short')) direction = 'short'
      }
    })
    if (direction === 'short' && o.size) o.size = o.size * -1
    return o
  },
}

const realTimePosition = {
  create: async (url: string) => {
    if (!url) return Promise.reject({ message: 'missing param: url' })

    try {
      const { TextDetections } = await rekognitionService.detectText.create(url) as DetectTextResponse
      const result = { exchange: null, found: null, position: {} }
      Object.keys(exchangeAnalyzer).some(exchange => {
        result.position = exchangeAnalyzer[exchange](TextDetections.filter(o => !o.ParentId)) as ISimplePosition
        if (Object.keys(result.position).length > 0) {
          result.found = true
          result.exchange = exchange
        }
        return result.found
      })
      if (result.found) return result
      return Promise.reject({ message: 'bad screenshot or unsupported exchange' })
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default realTimePosition