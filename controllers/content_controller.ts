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
    all: async (c: IContext) => {
      try {
        c.res.asJSON(await service.content.realTimePosition.all())
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
    cobak: {
      articles: async (c: IContext) => {
        try {
          const { list } = await service.content.news.cobak.articles(c.req.query as any) as any
          c.res.success(list)
        } catch (e) {
          c.res.failed({ message: '코박 뉴스를 가져오는 중 문제가 발생했습니다' })
        }
      },
      feeds: async (c: IContext) => {
        try {
          const { breaking_news_list } = await service.content.news.cobak.feeds(c.req.query as any) as any
          c.res.success(breaking_news_list)
        } catch (e) {
          c.res.failed({ message: '코박 뉴스를 가져오는 중 문제가 발생했습니다' })
        }
      },
      issues: async (c: IContext) => {
        try {
          c.res.success(await service.content.news.cobak.issues())
        } catch (e) {
          c.res.failed({ message: '코박 뉴스를 가져오는 중 문제가 발생했습니다' })
        }
      }
    },
  },
}

export default contentController