import IContext from '../core/interfaces/context'
import orm from '../core/orm'
import { Board } from '../entities/board'

const boardController = {
  all: async (c: IContext) => {
    try {
      const [data, total] = await orm.querySetter(c, Board).getManyAndCount()
      c.res.success({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
}

export default boardController