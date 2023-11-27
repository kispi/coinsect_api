import { Brackets } from 'typeorm'
import { PricePrediction } from '../entities/price_prediction'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'

const pricePredictionService = {
  all: async (c: IContext) => {
    if (c.req.query['limit'] > 20) return Promise.reject({ message: 'limit exceeded 20' })

    try {
      const qb = orm.querySetter(c, PricePrediction)
        .leftJoinAndSelect('PricePrediction.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')

      const keyword = (c.req.query['query'] || '').split('=')[1]
      if (keyword) {
        qb.andWhere(new Brackets(subQb => subQb
          .where(`PricePrediction.nickname LIKE "%${keyword}%"`)
          .orWhere(`profile.nickname LIKE "%${keyword}%"`)
        ))
      }

      const [data, total] = await qb.getManyAndCount()
      return { data, total }
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default pricePredictionService