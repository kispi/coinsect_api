import helpers from '../../core/helpers'
import useCache from '../../core/cache'
import presets from './position_presets'
import IContext from '../../core/interfaces/context'

type IPosition = {
  id: string
  name: string
  link: string
  image: string
  contract: string
  entryPrice: number
  liqPrice: number
  size: number
  onAir: boolean,
}

const cache = useCache()

const createPosition = ({
  image,
  name,
  link,
}: {
  image: string,
  name: string,
  link?: string,
}): IPosition => ({
  id: helpers.generateUUID(true),
  image,
  name,
  entryPrice: null,
  liqPrice: null,
  contract: 'BTCUSDT',
  size: null,
  link,
  onAir: true,
})

let cachedPositions = {
  data: presets.map(createPosition),
  lastUpdate: null,
}

const notifiedPositionHistories = []

const removeNotifiedPositionHistoriesOf = id => {
  const idx = notifiedPositionHistories.findIndex(o => o.id === id)
  if (idx >= 0) {
    notifiedPositionHistories.splice(idx, 1)
    removeNotifiedPositionHistoriesOf(id)
  }
}

const setRealTimePositions = o => {
  o.lastUpdate = helpers.dayjs().format()
  cache.set('content:realTimePositions', o)
}

const realTimePositionService = {
  presets: () => presets,
  changeNotification: {
    delete: id => {
      const idx = notifiedPositionHistories.findIndex(o => o.id === id)
      if (idx >= 0) notifiedPositionHistories.splice(idx, 1)
    },
    all: () => notifiedPositionHistories,
    create: async (c: IContext) => {
      const payload = c.req.body
      const keys = ['id', 'liqPrice', 'entryPrice', 'size', 'contract', 'name', 'image', 'link', 'onAir', 'token']
      try {
        await realTimePositionService.validate(payload)
        payload['requestedAt'] = helpers.dayjs().format()
        const acceptable = {
          ip: c.req.ip,
        }
        keys.filter(key => payload[key]).forEach(key => acceptable[key] = payload[key])
        notifiedPositionHistories.push(acceptable)
        return notifiedPositionHistories
      } catch (e) {
        return Promise.reject(e)
      }
    },
  },
  validate: async payload => {
    if (
      (payload.liqPrice && isNaN(parseFloat(payload.liqPrice))) ||
      (payload.entryPrice && isNaN(parseFloat(payload.entryPrice))) ||
      (payload.size && isNaN(parseFloat(payload.size)))
    ) throw { message: '진입가, 청산가, 규모는 숫자여야 합니다.' }

    if (payload.liqPrice && payload.entryPrice && payload.size) {
      if (payload.liqPrice > payload.entryPrice && payload.size > 0) throw { message: '롱포지션의 청산가가 진입가보다 높을 수는 없습니다' }
      if (payload.liqPrice < payload.entryPrice && payload.size < 0) throw { message: '숏포지션의 청산가가 진입가보다 낮을 수는 없습니다' }
    }

    if ((payload.name || '').length > 10) throw { message: '스트리머 이름은 10자 미만으로 적어주세요' }
    if ((payload.image || '').length > 300) throw { message: '300자 미만의 이미지 URL을 사용해주세요' }
    if ((payload.link || '').length > 200) throw { message: '200자 미만의 방송플랫폼 URL을 사용해주세요' }
    if (payload.contract && !payload.contract.endsWith('USDT')) throw { message: '계약은 반드시 USDT로 끝나야 합니다' }
  },
  all: async () => {
    const stored: any = await cache.get('content:realTimePositions')
    if (stored) cachedPositions = stored
    return cachedPositions
  },
  set: async payload => {
    if (!payload.id) {
      cachedPositions.data.push({
        id: helpers.generateUUID(true),
        image: payload.image,
        link: payload.link,
        name: payload.name,
        liqPrice: null,
        entryPrice: null,
        contract: 'BTCUSDT',
        size: null,
        onAir: true,
      })
      setRealTimePositions(cachedPositions)
      return
    }

    try {
      await realTimePositionService.validate(payload)

      if (!payload.id) payload.id = helpers.generateUUID(true)

      const found = cachedPositions.data.find(o => o.id === payload.id)
      if (!found) cachedPositions.data.push(createPosition(payload))
      else {
        found.image = (payload.image || '').trim()
        payload.entryPrice ? found.entryPrice = parseFloat(payload.entryPrice) : delete found.entryPrice
        payload.liqPrice ? found.liqPrice = parseFloat(payload.liqPrice) : delete found.liqPrice
        payload.size ? found.size = parseFloat(payload.size) : delete found.size
        found.contract = (payload.contract || '').trim()
        found.name = (payload.name || '').trim()
        found.link = (payload.link || '').trim()
        found.onAir = payload.onAir
      }
      removeNotifiedPositionHistoriesOf(found.id)
      setRealTimePositions(cachedPositions)
    } catch (e) {
      return Promise.reject(e)
    }
  },
  delete: async id => {
    const idx = cachedPositions.data.findIndex(o => o.id === id)
    if (idx >= 0) cachedPositions.data.splice(idx, 1)
    setRealTimePositions(cachedPositions)
  },
}

export default realTimePositionService