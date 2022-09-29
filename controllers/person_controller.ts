import IContext from '../core/interfaces/context'
import { Person } from '../entities/person'

export default {
  all: async (c: IContext) => {
    try {
      const [data, total] = await c.orm.getRepository(Person).createQueryBuilder()
        .leftJoinAndSelect('Person.images', 'images')
        .getManyAndCount()
      c.res.asJSON({ data, total })
    } catch (e) {
      c.res.failed(e)
    }
  },
}