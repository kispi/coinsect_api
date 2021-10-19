import IContext from '../core/context'
import { User } from '../entities/user'

const detail = (c: IContext) => {
  c.orm.getRepository(User).findOne(c.req.params['id'])
    .then(c.res.asJSON)
}

const all = (c: IContext) => {
  c.orm.getRepository(User).find()
    .then(c.res.asJSON)
}

const create = (c: IContext) => {
  c.orm.createQueryBuilder().insert().into(User).values([{
    name: c.req.query['name'],
    birthday: c.req.query['birthday'],
    email: c.req.query['email'],
  }]).execute()
    .then(() => c.res.asHTML('success'))
    .catch(c.res.failed)
}

export default {
  detail,
  all,
  create,
}