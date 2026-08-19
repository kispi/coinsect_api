import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import { Wallet } from '../entities/wallet'

const walletController = {
  all: async (c: IContext) => {
    try {
      const [data, total] = await orm.querySetter(c, Wallet)
        .leftJoinAndSelect('Wallet.blockchain', 'blockchain')
        .getManyAndCount()
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default walletController