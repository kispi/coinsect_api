import { dataSource } from '../database'
import { PricePrediction } from '../entities/price_prediction'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import helpers from '../core/helpers'
import pricePredictionService from '../services/price_prediction'
import chatService from '../services/chat'

const pricePredictionController = {
  create: async (c: IContext) => {
    if (!c.req.ip) {
      c.res.failed()
      return
    }

    const bannedUser = helpers.useBannedUser({ ip: c.req.ip })
    if (bannedUser) return c.res.failed({ message: 'BANNED_USER', extra: { bannedUser } })

    const payload = c.req.body as object
    try {
      await PricePrediction.populatePriceSnapshot(payload)
      await PricePrediction.validate(payload as PricePrediction)
    } catch (e) {
      return c.res.failed(e)
    }

    payload['ip'] = c.req.ip

    const user = await helpers.jwt.mustUser(c)
    if (user) {
      payload['user'] = user
      delete payload['password']
    } else {
      // 가격 예측 삭제 기능은 우선 넣지 말자. 그러면 비밀번호가 필요 없음
      // if (!payload['password']) return c.res.failed({ message: 'password is required' })
      // payload['password'] = helpers.crypto.hashed(payload['password'])
    }

    try {
      payload['sharingKey'] = helpers.crypto.generateUUID(true)
      await orm.querySetter(c, PricePrediction).insert().into(PricePrediction).values(payload).execute()
      c.res.success()

      chatService.broadcast({
        type: 'alert',
        text: `
          [${payload['nickname']}]님이 가격을 예측하였습니다.
          마켓: ${payload['ticker']}
          시기: ${pricePredictionService.helpers.dateRange(payload)}
          가격: ${pricePredictionService.helpers.priceRange(payload)}
        `,
        meta: {
          ...payload,
          $$alertType: 'pricePrediction',
        },
      })
    } catch (e) {
      c.res.failed(e)
    }
  },
  all: async (c: IContext) => {
    try {
      const { data, total } = await pricePredictionService.all(c)
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
  detail: async (c: IContext) => {
    try {
      const pricePrediction = await orm.querySetter(c, PricePrediction)
        .leftJoinAndSelect('PricePrediction.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where(`PricePrediction.sharing_key = '${c.req.params['sharingKey']}'`)
        .andWhere('PricePrediction.deleted_at IS NULL')
        .getOneOrFail() as PricePrediction
      c.res.asJSON(pricePrediction)
    } catch (e) {
      c.res.failed({ message: 'NOT_FOUND' }, 404)
    }
  },
  delete: async (c: IContext) => {
    const user = await helpers.jwt.mustUser(c)
    if (!user && !c.req.body['password']) return c.res.failed()

    try {
      const pricePredictionRepository = dataSource.getRepository(PricePrediction)
      const target = await pricePredictionRepository.findOneOrFail({ where: { sharingKey: c.req.params['sharingKey'] } })
      if (target.userId) {
        // 자기 자신의 게시글을 삭제하기 때문에 비밀번호가 필요 없는 경우
        if (user['id'] !== target.userId) return c.res.failed()
      } else {
        // 익명 게시글을 삭제하기 때문에 비밀번호가 필요한 경우
        if (!helpers.crypto.compare(target.password, c.req.body['password'])) return c.res.failed({ message: 'INCORRECT_PASSWORD' })
      }

      await pricePredictionRepository.softRemove(target)
      c.res.success()
    } catch (e) {
      c.res.failed()
      return    
    }
  },
  checkPassword: async (c: IContext) => {
    if (!c.req.body['password']) return c.res.failed({ message: 'MISSING_REQUIRED_FIELD_PASSWORD' })

    try {
      await PricePrediction.checkPassword(c.req.params['sharingKey'], c.req.body['password'])
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default pricePredictionController