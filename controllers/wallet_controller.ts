import { SelectQueryBuilder } from 'typeorm'
import IContext from '../core/interfaces/context'
import orm, { joinIfAbsent } from '../core/orm'
import { Wallet } from '../entities/wallet'

// ?join=Wallet.blockchain으로 이미 붙었으면 다시 붙이지 않는다. 중복 판정 이유는
// core/orm.ts의 joinIfAbsent 주석에 있다. 기존 이름을 얇은 래퍼로 남겨 둔다.
export const joinBlockchainIfNeeded = (qb: SelectQueryBuilder<any>) =>
  joinIfAbsent(qb, 'Wallet.blockchain', 'blockchain')

const walletController = {
  all: async (c: IContext) => {
    try {
      const qb = joinBlockchainIfNeeded(orm.querySetter(c, Wallet))
      const [data, total] = await qb.getManyAndCount()
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default walletController
