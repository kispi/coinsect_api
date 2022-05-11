import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const contentController = {
  publicTreasuries: async (c: IContext) => {
    try {
      c.res.asJSON(await service.content.publicTreasury.all())
    } catch (e) {
      c.res.failed()
    }
  },
  realTimePositions: {
    presets: (c: IContext) => c.res.asJSON(service.content.realTimePosition.presets()),
    changeNotification: {
      all: (c: IContext) => c.res.asJSON(service.content.realTimePosition.changeNotification.all()),
      create: async (c: IContext) => {
        try {
          c.res.success(await service.content.realTimePosition.changeNotification.create(c))
        } catch (e) {
          c.res.failed(e)
        }
      }
    },
    all: async (c: IContext) => c.res.asJSON(await service.content.realTimePosition.all()),
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
    coinness: {
      articles: async (c: IContext) => {
        try {
          c.res.success(await service.content.news.coinness.articles(c.req.query))
        } catch (e) {
          c.res.failed({ message: '코인니스 뉴스룸 기사를 가져오는 중 문제가 발생했습니다' })
        }
      },
      feeds: async (c: IContext) => {
        try {
          c.res.success(await service.content.news.coinness.feeds(c.req.query['lastId']))
        } catch (e) {
          c.res.failed({ message: '코인니스 피드를 가져오는 중 문제가 발생했습니다' })
        }
      },
      issues: async (c: IContext) => {
        try {
          c.res.success(await service.content.news.coinness.issues())
        } catch (e) {
          console.error(e, 'sibal')
          c.res.failed({ message: '코인니스 이슈를 가져오는 중 문제가 발생했습니다' })
        }
      }
    },
  },
}

export default contentController