import { SelectQueryBuilder } from 'typeorm'
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

// 컨트롤러가 querySetter 뒤에 체이닝하는 조인은 querySetter의 중복 검사 대상이 되지 않는다.
// TypeORM도 별칭 중복을 검사하지 않아 그대로 두 번 조인되고, 그러면 쿼리가 실행에서 죽는다.
// 클라이언트가 `?join=User.profile`을 보내야 where/sort가 `profile.nickname`을 쓸 수 있는데,
// 그 순간 컨트롤러의 체이닝과 겹치므로 이 가드 없이는 조인 컬럼 검색이 불가능하다.
export const joinIfAbsent = (qb: SelectQueryBuilder<any>, target: string, alias: string) => {
  if (!qb.expressionMap.aliases.some(a => a.name === alias)) {
    qb.leftJoinAndSelect(target, alias)
  }
  return qb
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
      // ?join= 파라미터 자체에 같은 관계가 중복으로 들어올 수 있다(예: ?join=Wallet.blockchain,Wallet.blockchain).
      // 그 경우 별칭이 겹치므로 두 번째부터는 건너뛴다.
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
