const { GoogleGenerativeAI } = require('@google/generative-ai')
import helpers from '../../core/helpers'
import useCache from '../../core/cache'
import presets from '../../constants/position_presets'
import IContext from '../../core/interfaces/context'
import slackService from '../slack'
import chatService from '../chat'

const now = () => helpers.dayjs().format()

type IRealTimePosition = {
  id: string
  name: string
  link: string
  image: string
  contract: string
  entryPrice: number
  liqPrice: number
  size: number
  onAir: boolean,
  editable: boolean,
  tracking: boolean,
  lastUpdate: Date | string,
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
}): IRealTimePosition => ({
  id: helpers.crypto.generateUUID(true),
  image,
  name,
  entryPrice: null,
  liqPrice: null,
  contract: 'BTCUSDT',
  size: null,
  link,
  onAir: true,
  editable: true,
  tracking: false,
  lastUpdate: now(),
})

let cachedPositions = {
  data: presets.map(createPosition),
  lastUpdate: null,
}

let notifiedPositionHistories = []

const removeNotifiedPositionHistoriesOf = id => {
  const idx = notifiedPositionHistories.findIndex(o => o.id === id)
  if (idx < 0) return

  notifiedPositionHistories.splice(idx, 1)
  removeNotifiedPositionHistoriesOf(id)
}

const setRealTimePositions = async o => {
  o.lastUpdate = now()
  cache.set('content:realTimePositions', o)

  const dashboards = await cache.get('dashboards:main')
  if ((dashboards || {}).realTimePositions) {
    dashboards.realTimePositions = {
      data: (o.data || []).filter(o => o.editable),
      lastUpdate: o.lastUpdate,
    }
    cache.set('dashboards:main', dashboards, 60)
  }
}

const positionHasChanged = (a, b) => ['contract', 'entryPrice', 'liqPrice', 'size'].some(field =>
  (a[field] && !b[field]) ||
  (!a[field] && b[field]) ||
  (a[field] && b[field] && a[field] != b[field])
)

const realTimePositionService = {
  presets: () => presets,
  changeNotification: {
    delete: id => {
      const idx = notifiedPositionHistories.findIndex(o => o.id === id)
      if (idx >= 0) notifiedPositionHistories.splice(idx, 1)
    },
    all: () => notifiedPositionHistories,
    create: async (c: IContext) => {
      const found = cachedPositions.data.find(o => o.id === c.req.body['id'])
      if (found && !found.editable) return Promise.reject({ message: '수정이 불가능한 포지션입니다.' })

      const payload = c.req.body

      if (!positionHasChanged(found, payload)) return Promise.reject({ message: '제출하신 포지션이 기존 포지션과 동일합니다.' })

      try {
        await realTimePositionService.validate(payload)
        const acceptable = {
          ip: c.req.ip,
          requestedAt: now(),
        }
        const keys = ['id', 'liqPrice', 'entryPrice', 'size', 'contract', 'name', 'image', 'link', 'onAir', 'token', 'tracking']
        keys.filter(key => payload[key]).forEach(key => acceptable[key] = payload[key])
        notifiedPositionHistories.push(acceptable)
        notifiedPositionHistories = notifiedPositionHistories.slice(-5) // 최근 5개까지만 유지
        const u = await chatService.getUser(payload['token'])
        slackService.postMessage({
          text: `
            포지션 수정 요청이 들어왔습니다
            요청자: ${u.profile.nickname} (${c.req.ip} / ${u.token})\n
            스트리머: *${payload['name']}*
            진입: ${payload['entryPrice']}
            청산: ${payload['liqPrice']}
            규모: ${payload['size']}
            계약: ${payload['contract']}
            방송: ${payload['onAir']}
          `,
          channel: 'coinsect_api',
        })
        return notifiedPositionHistories
      } catch (e) {
        return Promise.reject(e)
      }
    },
  },
  validate: async o => {
    const p = parseFloat
    if (
      (o.liqPrice && isNaN(p(o.liqPrice))) ||
      (o.entryPrice && isNaN(p(o.entryPrice))) ||
      (o.size && isNaN(p(o.size)))
    ) throw { message: '진입가, 청산가, 규모는 숫자여야 합니다.' }

    if (o.liqPrice && o.entryPrice && o.size) {
      if (p(o.liqPrice) > p(o.entryPrice) && o.size > 0) throw { message: '롱포지션의 청산가가 진입가보다 높을 수는 없습니다' }
      if (p(o.liqPrice) < p(o.entryPrice) && o.size < 0) throw { message: '숏포지션의 청산가가 진입가보다 낮을 수는 없습니다' }
    }

    if ((o.name || '').length > 20) throw { message: '스트리머 이름은 20자 미만으로 적어주세요' }
    if ((o.image || '').length > 255) throw { message: '255자 미만의 이미지 URL을 사용해주세요' }
    if ((o.link || '').length > 255) throw { message: '255자 미만의 방송플랫폼 URL을 사용해주세요' }
    if (o.contract && !o.contract.endsWith('USDT')) throw { message: '계약은 반드시 USDT로 끝나야 합니다' }
  },
  all: async () => {
    // 매번 레디스에서 읽어오도록 해야 나중에 서버가 분산되었을 때 data-sync 문제가 없고, 레디스의 RPS는 워낙 높아서 걱정할 수준이 아님.
    const stored = await cache.get('content:realTimePositions')
    if (stored) cachedPositions = stored
    return cachedPositions
  },
  set: async (payload, submittedByUser?) => {
    if (!payload.id) {
      cachedPositions.data.push({
        id: helpers.crypto.generateUUID(true),
        image: payload.image,
        link: payload.link,
        name: payload.name,
        liqPrice: null,
        entryPrice: null,
        contract: 'BTCUSDT',
        size: null,
        onAir: true,
        editable: true,
        tracking: true,
        lastUpdate: now(),
      })
      setRealTimePositions(cachedPositions)
      return
    }

    try {
      await realTimePositionService.validate(payload)

      if (!payload.id) payload.id = helpers.crypto.generateUUID(true)

      const found = cachedPositions.data.find(o => o.id === payload.id)
      const changed = positionHasChanged(found, payload)
      if (!found) return Promise.reject({ message: 'invalid request' })

      payload.entryPrice ? found.entryPrice = parseFloat(payload.entryPrice) : delete found.entryPrice
      payload.liqPrice ? found.liqPrice = parseFloat(payload.liqPrice) : delete found.liqPrice
      payload.size ? found.size = parseFloat(payload.size) : delete found.size
      found.contract = (payload.contract || '').trim()
      found.onAir = payload.onAir
      found.tracking = payload.tracking

      if (!submittedByUser) {
        found.image = (payload.image || '').trim()
        found.name = (payload.name || '').trim()
        found.link = (payload.link || '').trim()
        found.editable = payload.editable
      }
      removeNotifiedPositionHistoriesOf(found.id)

      if (changed) {
        found.lastUpdate = now()
        chatService.broadcast({
          type: 'alert',
          text: `
            [${found.name}] 포지션이 업데이트되었습니다.
            계약 / 규모: ${found.contract || '-'} / ${found.size || '-'}
            진입 / 청산: ${found.entryPrice || '-'} / ${found.liqPrice || '-'}
          `,
          meta: found,
        })
        chatService.broadcastPushNotifications({
          title: `[${found.name}] 포지션이 업데이트되었습니다.`,
          body: `
            계약 / 규모: ${found.contract || '-'} / ${found.size || '-'}
            진입 / 청산: ${found.entryPrice || '-'} / ${found.liqPrice || '-'}
          `,
          icon: found.image,
          link: 'https://coinsect.io/indicators/positions',
        })
      }
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
  autoParse: async (url: string) => {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const result = await model.generateContent([{
      text: `
        Fill this JSON using given image. Useful numbers are located at the bottom of the image.
        You can guess what is 'entry' and what is 'liq' by looking at the numbers, with a given position size (could be positive or negative).
        {
          "entryPrice": number, // some platforms say it as 'open' price.
          "liqPrice": number,
          "size": number, // Negative if it looks like a short position, positive if it looks like a long position.
          "contract": string // e.g. 'BTCUSDT' | 'ETHUSDT' ... ends with 'USDT'. If you're not sure, just put 'BTCUSDT'.
        }
      `,
    }, {
      inlineData: {
        mimeType: 'image/png',
        data: await helpers.imageUrlToBase64String(url),
      },
    }])
    return result.response.text()
  },
}
        

export default realTimePositionService
