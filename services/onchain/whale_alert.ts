import { log } from '../../core/logger'
import { WhaleAlert } from '../../entities/whale_alert'
import { dataSource } from '../../database'
import axios from 'axios'
import store from '../../store'
import orm from '../../core/orm'
import IContext from '../../core/interfaces/context'

const apiKey = store.state.serverConfig.WHALE_ALERT

// https://docs.whale-alert.io/
// Rate Limit for Free Plan: 10 per minute.

const whaleAlertService = {
  transactions: async (c: IContext, overridableQuery?: unknown) => {
    if (overridableQuery) c.req.query = overridableQuery

    if (c.req.query['limit'] > 20) return Promise.reject({ message: 'limit exceeded 20' })

    const qb = orm.querySetter(c, WhaleAlert).orderBy('timestamp', 'DESC')
    if (!c.req.query['limit']) qb.limit(20)

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
      dataSource.createQueryBuilder().insert().orIgnore().into(WhaleAlert).values(whaleAlerts).execute()
    } catch (e) {
      return Promise.reject(e)
    }
  },
}

export default whaleAlertService