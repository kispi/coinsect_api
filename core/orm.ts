import { dataSource } from '../database'
import IContext from './interfaces/context'
import { applyFilters, parseFilters, parseJoins, parsePositiveInt, parseSort } from './query_filter'

export const MAX_LIMIT = 1000
export const MAX_OFFSET = 1000000

export interface QueryOverrides {
  limit?: number
  offset?: number
  where?: string | string[]
  sort?: string
  order?: string
  join?: string
}

const orm = {
  // overrides를 주면 요청 쿼리 대신 그것을 읽는다. 내부 호출이 c.req.query를
  // 덮어쓰지 않도록 하기 위한 것이다.
  querySetter: (c: IContext, model, overrides?: QueryOverrides) => {
    const q = overrides || c.req.query || {}
    const meta = dataSource.getRepository(model).metadata
    const alias = meta.name
    const qb = c.orm.getRepository(model).createQueryBuilder(alias)

    const limit = parsePositiveInt(q['limit'], { fallback: 0, max: MAX_LIMIT })
    if (limit) qb.limit(limit)

    const offset = parsePositiveInt(q['offset'], { fallback: 0, max: MAX_OFFSET })
    if (offset) qb.offset(offset)

    // 조인이 먼저다. where와 sort가 조인 별칭(profile.nickname 등)을 참조할 수 있으므로
    // 별칭 맵이 있어야 검증이 된다.
    const { joins, aliases } = parseJoins(q['join'], meta, alias)
    joins.forEach(({ target, alias: joinAlias }) => {
      // 컨트롤러가 이미 같은 관계를 조인해 둔 경우가 있다(wallet_controller). 중복 별칭은 건너뛴다.
      if (qb.expressionMap.aliases.some(a => a.name === joinAlias)) return
      qb.leftJoinAndSelect(target, joinAlias)
    })

    const sort = parseSort(q['sort'], q['order'], meta, alias, aliases)
    if (sort) qb.orderBy(`${sort.alias}.${sort.property}`, sort.order)

    applyFilters(qb, parseFilters(q['where'], meta, alias, aliases))

    return qb
  },
}

export default orm
