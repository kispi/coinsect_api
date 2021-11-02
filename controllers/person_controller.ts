import IContext from '../core/context'
import { Person } from '../entities/person'

export default {
  all: (c: IContext) => {
    c.orm.getRepository(Person).createQueryBuilder()
      .leftJoinAndSelect('Person.images', 'images')
      .getManyAndCount()
      .then(res => c.res.asJSON({
        data: res[0],
        total: res[1],
      }))
      .catch(c.res.failed)
  },
}