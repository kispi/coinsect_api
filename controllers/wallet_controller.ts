import { SelectQueryBuilder } from 'typeorm'
import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import { Wallet } from '../entities/wallet'

// ?join=Wallet.blockchain으로 이미 붙었으면 다시 붙이지 않는다. orm.querySetter는
// 자신만의 쿼리빌더를 만들어 ?join= 루프를 다 돌리고 반환하므로, 그 다음에 컨트롤러가
// 체이닝하는 조인은 querySetter의 중복 검사 대상이 되지 않는다. TypeORM도 별칭 중복을
// 검사하지 않아 그대로 두 번 조인되고, 그러면 쿼리가 실행에서 죽는다. 그래서 여기서
// 직접 검사한다.
export const joinBlockchainIfNeeded = (qb: SelectQueryBuilder<any>) => {
  if (!qb.expressionMap.aliases.some(a => a.name === 'blockchain')) {
    qb.leftJoinAndSelect('Wallet.blockchain', 'blockchain')
  }
  return qb
}

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