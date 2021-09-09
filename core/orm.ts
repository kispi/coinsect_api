import { getRepository } from 'typeorm'
import IContext from './context'

const columnWithTable = (column, entityName) => {
  if (column.includes('.')) return column

  return `${entityName}.${column}`
}

const orm = {
  querySetter: (c: IContext, model) => {
    const q = c.req.query
    const entityName = getRepository(model).metadata.name
    const qb = c.orm.getRepository(model).createQueryBuilder(entityName)
    if (q['limit']) qb.limit(q['limit'])
    if (q['offset']) qb.offset(q['offset'])
    if (q['sort']) qb.orderBy(columnWithTable(q['sort'], entityName), (q['order'] || 'desc').toUpperCase())
    if (q['where']) qb.where(decodeURI(q['where']))
    if (q['join']) q['join'].split(',').forEach((target, idx) => qb.leftJoinAndSelect(target, `tb_${idx}`))
    return qb
  },
}

export default orm