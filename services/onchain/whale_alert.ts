import axios from 'axios'
import store from '../../store'
import IContext from '../../core/interfaces/context'
import orm from '../../core/orm'
import { log } from '../../core/logger'
import { getConnection } from 'typeorm'
import { WhaleAlert } from '../../entities/whale_alert'

const apiKey = store.state.serverConfig.WHALE_ALERT

// https://docs.whale-alert.io/
// Rate Limit for Free Plan: 10 per minute.

const whaleAlertService = {
  transactions: async (c: IContext) => {
    const limit = parseInt(c.req.query['limit']) || 100
    if (limit > 100) {
      c.res.failed({ message: 'limit exceeded 100' })
      return
    }

    const qb = orm.querySetter(c, WhaleAlert).orderBy('timestamp', 'DESC').limit(limit)
    const [data, total] = await qb.getManyAndCount()
    return {
      data,
      total,
    }
  },
  crawl: async (minValue: number = 500000) => {
    if (!apiKey) {
      log.error('whaleAlert.crawl: .env WHALE_ALERT is missing')
      return
    }

    const orm = getConnection()
    try {
      const data = await axios.get(`https://api.whale-alert.io/v1/transactions?api_key=${apiKey}&min_value=${minValue}`) as any
      const whaleAlerts = (data.transactions || []).filter(t => t.transaction_count === 1).map(t => ({
        hash: t.hash,
        amount: t.amount,
        amountUsd: t.amount_usd,
        fromAddress: t.from.address,
        fromOwner: t.from.owner,
        fromOwnerType: t.from.owner_type,
        toAddress: t.to.address,
        toOwner: t.to.owner,
        toOwnerType: t.to.owner_type,
        blockchain: t.blockchain,
        symbol: t.symbol,
        transactionCount: t.transaction_count,
        transactionType: t.transaction_type,
        timestamp: t.timestamp,
      }))
      orm.createQueryBuilder().insert().orIgnore().into(WhaleAlert).values(whaleAlerts).execute()
      log.info(`whaleAlert.crawl: crawling with minValue = ${minValue} success`)
    } catch (e) {
      log.error(`whaleAlert.crawl: crawling with minValue = ${minValue} failed`, e.data)
      return Promise.reject(e)
    }
  },
}

export default whaleAlertService