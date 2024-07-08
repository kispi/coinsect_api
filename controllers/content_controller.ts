import helpers from '../core/helpers'
import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const contentController = {
  nutrition: {
    paikdabang: async (c: IContext) => {
      try {
        c.res.asJSON(await service.content.nutrition.paikdabang.all())
      } catch (e) {
        c.res.failed()
      }
    },
  },
  publicTreasuries: async (c: IContext) => {
    try {
      c.res.asJSON(await service.content.publicTreasury.all())
    } catch (e) {
      c.res.failed()
    }
  },
  realTimePositions: {
    presets: (c: IContext) => c.res.asJSON(service.content.realTimePosition.presets()),
    autoParse: async (c: IContext) => {
      try {
        const data = await service.content.realTimePosition.autoParse(c.req.body['url'])
        c.res.asJSON(data)
      } catch (e) {
        c.res.failed(e)
      }
    },
    changeNotification: {
      all: (c: IContext) => c.res.asJSON(service.content.realTimePosition.changeNotification.all()),
      create: async (c: IContext) => {
        try {
          c.res.success(await service.content.realTimePosition.changeNotification.create(c))
        } catch (e) {
          c.res.failed(e)
        }
      },
    },
    all: async (c: IContext) => {
      try {
        c.res.asJSON(helpers.crypto.encryptAPIResponse(await service.content.realTimePosition.all()))
      } catch (e) {
        c.res.failed(e)
      }
    },
    set: async (c: IContext) => {
      try {
        await service.content.realTimePosition.set(c.req.body)
        c.res.success()
      } catch (e) {
        c.res.failed(e)
      }
    },
    delete: async (c: IContext) => {
      try {
        await service.content.realTimePosition.delete(c.req.params['id'])
        c.res.success()
      } catch (e) {
        c.res.failed(e)
      }
    },
  },
  news: {
    upbit: async (c: IContext) => {
      try {
        const data = await service.content.news.upbit()
        c.res.success(data)
      } catch (e) {
        c.res.failed({ message: '업비트 뉴스를 가져오는 중 문제가 발생했습니다' })
      }
    },
  },
}

export default contentController