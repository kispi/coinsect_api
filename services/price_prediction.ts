import { Brackets } from 'typeorm'
import { PricePrediction } from '../entities/price_prediction'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import helpers from '../core/helpers'

const pricePredictionService = {
  helpers: {
    dateRange: pricePrediction => {
      const d = (date: Date) => helpers.dayjs(date).format('YYYY-MM-DD')
      if (pricePrediction.timeFrom && pricePrediction.timeTo) return `${d(pricePrediction.timeFrom)} ~ ${d(pricePrediction.timeTo)}`
      if (pricePrediction.timeFrom) return `${d(pricePrediction.timeFrom)} ~`
      if (pricePrediction.timeTo) return `~ ${d(pricePrediction.timeTo)}`
    },
    priceRange: pricePrediction => {
      const p = (price: number) => helpers.prettyPrice(price)
      if (parseFloat(pricePrediction.priceMin) && parseFloat(pricePrediction.priceMax)) return `$${p(pricePrediction.priceMin)} ~ $${p(pricePrediction.priceMax)}`
      if (parseFloat(pricePrediction.priceMin)) return `$${p(pricePrediction.priceMin)} ~`
      if (parseFloat(pricePrediction.priceMax)) return `~ $${p(pricePrediction.priceMax)}`
    },
  },
  all: async (c: IContext) => {
    if (c.req.query['limit'] > 20) return Promise.reject({ message: 'limit exceeded 20' })

    try {
      const qb = orm.querySetter(c, PricePrediction)
        .leftJoinAndSelect('PricePrediction.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')

      const keyword = c.req.query['keyword']
      if (keyword) {
        // 값에 든 %와 _를 리터럴로 만든다. 이스케이프하지 않으면 조건이 임의로 넓어진다.
        const pattern = `%${keyword.replace(/[\\%_]/g, ch => `\\${ch}`)}%`
        qb.andWhere(new Brackets(subQb => subQb
          .where('PricePrediction.nickname ILIKE :pattern', { pattern })
          .orWhere('profile.nickname ILIKE :pattern', { pattern })
        ))
      }

      if (!c.req.query['limit']) qb.limit(20)

      const [data, total] = await qb.getManyAndCount()
      return { data, total }
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default pricePredictionService