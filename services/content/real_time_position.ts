import helpers from '../../core/helpers'
import useCache from '../../core/cache'
import presets from '../../constants/position_presets'
import IContext from '../../core/interfaces/context'
import slack from '../slack'
import store from '../../store'
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
  id: helpers.generateUUID(true),
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

const setRealTimePositions = o => {
  o.lastUpdate = now()
  cache.set('content:realTimePositions', o)
}

const positionHasChanged = (a, b) => {
  // 편의상 약한 비교
  if (a.contract != b.contract) return true
  if (a.entryPrice != b.entryPrice) return true
  if (a.liqPrice != b.liqPrice) return true
  if (a.size != b.size) return true
  return false
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
      const found = cachedPositions.data.find(o => o.id === c.req.body['id'])
      if (found && !found.editable) return Promise.reject({ message: '수정이 불가능한 포지션입니다.' })

      const bannedUser = helpers.useBannedUser(c.req.ip)
      if (bannedUser) return Promise.reject({ message: `오기입으로 수정 요청이 제한되었습니다. (해제: ${helpers.dayjs(bannedUser.until).format('YYYY-MM-DD HH:mm:ss')}` })

      const payload = c.req.body
      const keys = ['id', 'liqPrice', 'entryPrice', 'size', 'contract', 'name', 'image', 'link', 'onAir', 'token', 'tracking']

      if (!positionHasChanged(found, payload)) return Promise.reject({ message: '제출하신 포지션이 기존 포지션과 동일합니다.' })

      try {
        await realTimePositionService.validate(payload)
        const acceptable = {
          ip: c.req.ip,
          requestedAt: now(),
        }
        keys.filter(key => payload[key]).forEach(key => acceptable[key] = payload[key])
        acceptable['tracking'] = true // 누군가 보고 있기 때문에 이런 요청이 온 것이기 떄문
        notifiedPositionHistories.push(acceptable)
        notifiedPositionHistories = notifiedPositionHistories.slice(-5) // 최근 5개까지만 유지
        const u = await chatService.getUser(payload['token'])
        const allowed = store.state.globalVariables.allowDirectPositionEdit
        slack.postMessage(`
          ${allowed ? '포지션이 수정되었습니다' : '포지션 수정 요청이 들어왔습니다'}
          요청자: ${u.profile.nickname} (${c.req.ip} / ${u.token})\n
          스트리머: *${payload['name']}*
          진입: ${payload['entryPrice']}
          청산: ${payload['liqPrice']}
          규모: ${payload['size']}
          계약: ${payload['contract']}
          방송: ${payload['onAir']}
        `)
        if (allowed) {
          realTimePositionService.set(payload, true)
        }
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

    if ((payload.name || '').length > 20) throw { message: '스트리머 이름은 20자 미만으로 적어주세요' }
    if ((payload.image || '').length > 255) throw { message: '255자 미만의 이미지 URL을 사용해주세요' }
    if ((payload.link || '').length > 255) throw { message: '255자 미만의 방송플랫폼 URL을 사용해주세요' }
    if (payload.contract && !payload.contract.endsWith('USDT')) throw { message: '계약은 반드시 USDT로 끝나야 합니다' }
  },
  all: async () => {
    const stored = await cache.get('content:realTimePositions')
    if (!(cachedPositions || {}).lastUpdate && stored) cachedPositions = stored

    return cachedPositions
  },
  set: async (payload, submittedByUser?) => {
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
        editable: true,
        tracking: true,
        lastUpdate: now(),
      })
      setRealTimePositions(cachedPositions)
      return
    }

    try {
      await realTimePositionService.validate(payload)

      if (!payload.id) payload.id = helpers.generateUUID(true)

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
}

export default realTimePositionService
