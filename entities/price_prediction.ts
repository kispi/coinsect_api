import { Entity, Column, ManyToOne, Index } from 'typeorm'
import { User } from './user'
import { dataSource } from '../database'
import helpers from '../core/helpers'
import store from '../store'
import BaseModel from './base_model'
import axios from 'axios'

@Entity({ name: 'price_predictions' })
export class PricePrediction extends BaseModel {
  @ManyToOne(() => User, { onDelete: 'SET NULL', createForeignKeyConstraints: false })
  user: User

  @Column({ nullable: true })
  userId: number

  @Column()
  nickname: string

  @Column({ nullable: true })
  ip: string

  @Column({ nullable: true })
  @Index()
  sharingKey: string

  @Column({ nullable: true })
  password: string

  @Column()
  ticker: string

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  priceSnapshot: number

  @Column({ nullable: true })
  timeFrom: Date

  @Column({ nullable: true })
  timeTo: Date

  @Column({ nullable: true, type: 'decimal', precision: 36, scale: 18 })
  priceMin: number

  @Column({ nullable: true, type: 'decimal', precision: 36, scale: 18 })
  priceMax: number

  static async populatePriceSnapshot(pricePrediction) {
    // pricePrediction.createdAt과 이 함수가 호출된 시간이 크게 다르다면(EX: 1분 이상 차이) 오류를 내는 로직이 필요할 수도 있음
    try {
      const resp = await axios.get(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${pricePrediction.ticker}`)
      pricePrediction.priceSnapshot = parseFloat(resp['result']['list'][0].indexPrice)
    } catch (e) {
      return Promise.reject(e)
    }
  }

  static async validate(pricePrediction: PricePrediction) {
    if (!pricePrediction.priceMin && !pricePrediction.priceMax) {
      return Promise.reject({ message: 'PRICE_MIN_OR_MAX_REQUIRED' })
    }

    if (pricePrediction.priceMin && pricePrediction.priceMax && pricePrediction.priceMin > pricePrediction.priceMax) {
      return Promise.reject({ message: 'PRICE_MIN_MUST_BE_LESS_THAN_PRICE_MAX' })
    }

    if (!pricePrediction.timeFrom && !pricePrediction.timeTo) {
      return Promise.reject({ message: 'TIME_FROM_OR_TIME_TO_REQUIRED' })
    }

    if (
      (pricePrediction.timeFrom && !helpers.dayjs(pricePrediction.timeFrom).isValid()) ||
      (pricePrediction.timeTo && !helpers.dayjs(pricePrediction.timeTo).isValid())
    ) {
      return Promise.reject({ message: 'INVALID_DATE' })
    }

    if (pricePrediction.timeFrom && pricePrediction.timeTo && pricePrediction.timeFrom > pricePrediction.timeTo) {
      return Promise.reject({ message: 'FROM_MUST_BE_LESS_THAN_TO' })
    }

    if (helpers.dayjs().isAfter(pricePrediction.timeFrom)) {
      return Promise.reject({ message: 'FROM_MUST_BE_IN_FUTURE' })
    }

    if (!pricePrediction.priceSnapshot) {
      return Promise.reject({ message: 'CANNOT_POPULATE_PRICE_SNAPSHOT' })
    }

    if (pricePrediction.nickname.length > store.state.globalVariables.maxlength.nickname) {
      return Promise.reject({ message: 'NICKNAME_TOO_LONG' })
    }
  }

  static async checkPassword(sharingKey: string, password: string) {
    if (!password) Promise.reject({ message: 'INCORRECT_PASSWORD' })

    try {
      const target = await dataSource.getRepository(PricePrediction).findOneOrFail({ where: { sharingKey }})
      if (!helpers.crypto.compare(target.password, password)) {
        return Promise.reject({ message: 'INCORRECT_PASSWORD' })
      }
      return Promise.resolve()
    } catch (e) {
      return Promise.reject({ message: 'NOT_FOUND' })
    }
  }

  toJSON() {
    delete this.password
    return this
  }
}