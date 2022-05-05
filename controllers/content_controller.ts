import IContext from '../core/interfaces/context'
import useService from '../services'

const service = useService()

const contentController = {
  publicTreasuries: async (c: IContext) => {
    try {
      c.res.asJSON(await service.content.publicTreasuries())
    } catch (e) {
      c.res.failed()
    }
  },
  realTimePositions: {
    presets: (c: IContext) => c.res.asJSON(service.content.realTimePositions.presets()),
    all: async (c: IContext) => c.res.asJSON(await service.content.realTimePositions.all()),
    set: async (c: IContext) => {
      try {
        await service.content.realTimePositions.set(c.req.body)
        c.res.success()
      } catch (e) {
        c.res.failed(e)
      }
    },
    delete: async (c: IContext) => {
      try {
        await service.content.realTimePositions.delete(c.req.params['id'])
        c.res.success()
      } catch (e) {
        c.res.failed(e)
      }
    },
  },
  news: {
    coinness: {
      feeds: async (c: IContext) => {
        try {
          c.res.success(await service.content.news.coinness.feeds(c.req.query['lastId']))
        } catch (e) {
          console.error('coinness error:', e)
          c.res.failed({ message: '코인니스 피드를 가져오는 중 문제가 발생했습니다' })
        }
      },
      articles: async (c: IContext) => {
        try {
          c.res.success(await service.content.news.coinness.articles(c.req.query))
        } catch (e) {
          console.error('coinness error:', e)
          c.res.failed({ message: '코인니스 뉴스룸 기사를 가져오는 중 문제가 발생했습니다' })
        }
      },
    },
  },
}

export default contentController