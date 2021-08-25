import IContext from './context'

const orm = {
  querySetter: (c: IContext, model) => {
    const q = c.req.query
    const qb = c.orm.getRepository(model).createQueryBuilder()
    if (q['limit']) qb.limit(q['limit'])
    if (q['offset']) qb.offset(q['offset'])
    if (q['sort']) qb.orderBy(q['sort'], (q['order'] || 'desc').toUpperCase())
    if (q['where']) qb.where(decodeURI(q['where']))
    return qb
  },
}

export default orm