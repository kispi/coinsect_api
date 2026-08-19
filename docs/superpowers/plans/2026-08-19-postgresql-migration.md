# PostgreSQL 마이그레이션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 중인 `coinsect` DB를 MySQL 8.0.46에서 PostgreSQL 16.14로 옮기고, 그 과정에서 문자열 보간으로 만들어지던 SQL을 전부 파라미터 바인딩으로 바꾸며, 마이그레이션 31개를 현재 상태 스냅샷 한 장으로 대체한다.

**Architecture:** TypeORM은 유지하고 드라이버만 `mysql2` → `pg`로 바꾼다. 코드 수정은 두 단계로 나눈다 — MySQL에서도 그대로 동작하는 파라미터 바인딩 작업을 먼저 전부 끝내고(그래서 기존 DB로 검증이 가능하다), PostgreSQL 전용 문법(`ILIKE`)과 드라이버 전환은 마지막에 한 번에 몰아친다. 데이터는 두 DB가 같은 EC2 인스턴스에 있으므로 서버 위에서 localhost↔localhost로 옮긴다.

**Tech Stack:** Node.js 22.12, TypeScript 6, Fastify 5, TypeORM 0.3.31, PostgreSQL 16.14, `node:test` (내장 러너), `pg`, `mysql2`

## Global Constraints

- 스키마 기준선은 **엔티티가 아니라 라이브 MySQL에서 뜬 DDL**이 기준이다. `migrations` 테이블(30행)과 파일(31개)이 이미 어긋나 있다.
- 모든 시각 컬럼은 `timestamptz`다. `timestamp without time zone`을 쓰면 node-postgres가 Node 프로세스 로컬 시각으로 파싱해 전 데이터가 조용히 밀린다.
- 이관 스크립트는 MySQL을 `dateStrings: true`로 읽는다. 드라이버 타임존 해석에 의존하지 않는다.
- 서버 가용 메모리는 1GB뿐이다. 배치는 1000행 단위.
- `reactions.message_id`의 FK는 `messages_202605`를 가리킨다. 운영과 1:1로 보존한다. **고치지 말 것** — 별개 작업이다.
- 이번 범위는 SQLi 한정이다. 인증, 비밀번호 해싱, 자격증명 평문 보관은 건드리지 않는다.
- 커밋 메시지는 한국어, 기존 저장소 스타일(`type: 동사로 끝나는 한 줄`)을 따른다.
- 자격증명: PostgreSQL `webserver.coinsect.io:5432`, 롤/DB 모두 `coinsect`, 비밀번호는 기존 MySQL과 동일. SSH는 `C:\Users\kispi\Desktop\aws\kispi-seoul.pem`, 사용자 `ubuntu`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `tsconfig.test.json` (신규) | 테스트 전용 TS 설정. 루트 tsconfig는 `moduleResolution: bundler`라 `node:test` 타입을 못 찾는다 |
| `tests/*.test.ts` (신규) | `node:test` 단위 테스트 |
| `core/query_filter.ts` (신규) | `?where=`/`?sort=`/`?join=`/`?limit=` 파싱과 검증. 순수 함수라 DB 없이 테스트된다 |
| `core/orm.ts` (수정) | `querySetter`를 `query_filter` 위로 재배선 |
| `core/controller.ts` (수정) | `useCRUD`의 id 보간 제거, `IN (:...ids)` 수정 |
| `entities/message.ts` (수정) | `populateReactions`의 IN 보간 제거 |
| `controllers/*.ts` (수정) | 각 컨트롤러의 보간 제거 |
| `services/post.ts`, `services/price_prediction.ts`, `services/dashboard.ts` (수정) | LIKE 검색 파라미터화, DSL 문법 반영 |
| `chat/controllers.ts` (수정) | 커서 보간 제거 |
| `schema/001_baseline.sql` (신규) | 현재 상태의 PostgreSQL DDL 스냅샷 |
| `tools/migrate/` (신규) | 이관/델타/검증 스크립트. 서버에서 단독 실행되는 ESM `.mjs` |
| `migrations/` (삭제) | 파일 31개 |
| `database.ts`, `ormconfig.ts`, `ormconfig.sample.ts`, `package.json` (수정) | 드라이버 전환 |

**스펙과의 차이 한 가지:** 스펙은 `tools/migrate/*.ts`로 적었으나 `.mjs`로 간다. 이 도구는 서버에서 배포 산출물과 무관하게 단독 실행되는 일회성 운영 스크립트다. `.mjs`면 자체 `package.json`에 `mysql2`와 `pg`만 두고 빌드 단계 없이 돌릴 수 있어, 메모리 1GB 서버에서 ts-node/tsconfig를 얹는 실패 지점이 사라진다.

---

## Task 1: 테스트 러너 구축

이후 모든 작업이 TDD로 진행되려면 러너가 먼저 있어야 한다. 이 설정은 검증을 마친 조합이다 — 루트 `tsconfig.json`은 `moduleResolution: "bundler"`에 `types` 지정이 없어서 `node:test` import가 `TS2591`로 깨진다.

**Files:**
- Create: `tsconfig.test.json`
- Create: `tests/query_filter.test.ts` (스모크 1건, Task 2에서 채운다)
- Modify: `package.json` (scripts.test)

**Interfaces:**
- Produces: `npm test` — `tests/**/*.test.ts`를 모두 실행한다

- [ ] **Step 1: 테스트 전용 tsconfig 작성**

`tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "types": ["node"],
    "lib": ["es2022"],
    "target": "es2022",
    "noEmit": true
  }
}
```

- [ ] **Step 2: 스모크 테스트 작성**

`tests/query_filter.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('러너가 TypeScript 테스트를 실행한다', () => {
  assert.equal(1, 1)
})
```

- [ ] **Step 3: package.json의 test 스크립트 교체**

`"test": "echo \"Error: no test specified\" && exit 1"` 을 아래로 바꾼다. 따옴표로 감싼 glob은 셸이 아니라 Node가 확장하므로 Windows/Linux 모두에서 동작한다.

```json
"test": "cross-env TS_NODE_PROJECT=tsconfig.test.json node --require ts-node/register --test \"tests/**/*.test.ts\""
```

- [ ] **Step 4: 실행해서 통과 확인**

Run: `npm test`
Expected: `# pass 1`, `# fail 0`

- [ ] **Step 5: 커밋**

```bash
git add tsconfig.test.json tests/query_filter.test.ts package.json
git commit -m "test: node:test 기반 테스트 러너를 도입한다

루트 tsconfig는 moduleResolution이 bundler이고 types 지정이 없어 node:test
import가 TS2591로 깨진다. 테스트 전용 tsconfig를 따로 둔다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: `?where=` DSL 파서

가장 중요한 보안 작업이다. 현재 `core/orm.ts:20`이 쿼리스트링을 WHERE 절에 그대로 붙이고, 이 경로가 `/boards`, `/notifications`, `/wallets`, `/posts`, `/price_predictions`, `/whale_alerts` 등 **인증 없는 공개 엔드포인트**에서 쓰인다.

순수 함수 모듈이라 DB 없이 전부 단위 테스트할 수 있다.

**Files:**
- Create: `core/query_filter.ts`
- Modify: `tests/query_filter.test.ts`

**Interfaces:**
- Produces:
  - `class FilterError extends Error { status: number }`
  - `parseFilters(raw: unknown, meta: EntityMetadata): ParsedFilter[]`
  - `applyFilters(qb: SelectQueryBuilder<any>, alias: string, filters: ParsedFilter[]): void`
  - `parseSort(rawSort: unknown, rawOrder: unknown, meta: EntityMetadata): { property: string, order: 'ASC' | 'DESC' } | null`
  - `parseJoins(raw: unknown, meta: EntityMetadata, rootAlias: string): Array<{ target: string, alias: string }>`
  - `parsePositiveInt(raw: unknown, opts: { fallback: number, max: number }): number`
  - `interface ParsedFilter { property: string, op: FilterOp, value: string | string[] | boolean | null }`
  - `type FilterOp = 'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'like'|'in'|'isnull'`

**설계 노트:** `ParsedFilter.property`는 DB 컬럼명이 아니라 **엔티티 프로퍼티명**을 담는다. TypeORM QueryBuilder는 `alias.propertyName`을 실제 컬럼으로 번역해 주므로, 이렇게 해야 `SnakeNamingStrategy`에 결합되지 않는다. 입력은 프로퍼티명(`amountUsd`)과 DB 컬럼명(`amount_usd`) 둘 다 받는다 — 기존 호출부가 후자를 쓰고 있다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/query_filter.test.ts` 전체를 아래로 교체한다. `EntityMetadata`는 무겁기 때문에 파서가 실제로 쓰는 부분만 흉내 낸 가짜를 쓴다.

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FilterError,
  applyFilters,
  parseFilters,
  parseJoins,
  parsePositiveInt,
  parseSort,
} from '../core/query_filter'

// parseFilters/parseSort/parseJoins가 EntityMetadata에서 실제로 읽는 것은
// columns[].propertyName, columns[].databaseName, relations[] 뿐이다.
const fakeMeta = (overrides: any = {}): any => ({
  name: 'WhaleAlert',
  columns: [
    { propertyName: 'hash', databaseName: 'hash' },
    { propertyName: 'amountUsd', databaseName: 'amount_usd' },
    { propertyName: 'fromOwnerType', databaseName: 'from_owner_type' },
    { propertyName: 'deletedAt', databaseName: 'deleted_at' },
  ],
  relations: [],
  ...overrides,
})

// andWhere 호출을 기록만 하는 가짜 QueryBuilder.
const fakeQb = () => {
  const calls: Array<{ sql: string, params?: object }> = []
  return {
    calls,
    andWhere(sql: string, params?: object) { calls.push({ sql, params }); return this },
  }
}

test('parseFilters: 값이 비면 빈 배열을 준다', () => {
  assert.deepEqual(parseFilters(undefined, fakeMeta()), [])
  assert.deepEqual(parseFilters('', fakeMeta()), [])
})

test('parseFilters: DB 컬럼명을 프로퍼티명으로 정규화한다', () => {
  const [filter] = parseFilters('amount_usd:gte:3000000', fakeMeta())
  assert.equal(filter.property, 'amountUsd')
  assert.equal(filter.op, 'gte')
  assert.equal(filter.value, '3000000')
})

test('parseFilters: 프로퍼티명도 그대로 받는다', () => {
  const [filter] = parseFilters('amountUsd:gte:3000000', fakeMeta())
  assert.equal(filter.property, 'amountUsd')
})

test('parseFilters: 엔티티에 없는 컬럼은 거부한다', () => {
  assert.throws(() => parseFilters('nope:eq:1', fakeMeta()), FilterError)
})

test('parseFilters: 임의 SQL은 컬럼 검증에서 막힌다', () => {
  assert.throws(() => parseFilters('1=1 OR 1=1', fakeMeta()), FilterError)
  assert.throws(() => parseFilters("hash:eq:x' OR '1'='1", fakeMeta()), FilterError, undefined,
    '연산자 자리가 비정상이면 거부되어야 한다')
})

test('parseFilters: 허용되지 않은 연산자는 거부한다', () => {
  assert.throws(() => parseFilters('hash:regexp:x', fakeMeta()), FilterError)
})

test('parseFilters: in은 쉼표로 나눈다', () => {
  const [filter] = parseFilters('hash:in:a,b,c', fakeMeta())
  assert.deepEqual(filter.value, ['a', 'b', 'c'])
})

test('parseFilters: isnull은 불리언만 받는다', () => {
  assert.equal(parseFilters('deleted_at:isnull:true', fakeMeta())[0].value, true)
  assert.equal(parseFilters('deleted_at:isnull:false', fakeMeta())[0].value, false)
  assert.throws(() => parseFilters('deleted_at:isnull:yes', fakeMeta()), FilterError)
})

test('parseFilters: like는 값의 와일드카드를 이스케이프한다', () => {
  const [filter] = parseFilters('hash:like:100%_x', fakeMeta())
  assert.equal(filter.value, '%100\\%\\_x%')
})

test('parseFilters: 값에 콜론이 있어도 잘리지 않는다', () => {
  const [filter] = parseFilters('hash:eq:a:b:c', fakeMeta())
  assert.equal(filter.value, 'a:b:c')
})

test('parseFilters: 배열로 여러 조건을 받는다', () => {
  const filters = parseFilters(['hash:eq:a', 'amount_usd:gte:1'], fakeMeta())
  assert.equal(filters.length, 2)
})

test('parseFilters: 조건 개수 상한을 넘기면 거부한다', () => {
  const many = Array.from({ length: 11 }, () => 'hash:eq:a')
  assert.throws(() => parseFilters(many, fakeMeta()), FilterError)
})

test('parseFilters: 지나치게 긴 값은 거부한다', () => {
  assert.throws(() => parseFilters(`hash:eq:${'a'.repeat(201)}`, fakeMeta()), FilterError)
})

test('applyFilters: 값을 SQL에 넣지 않고 파라미터로 넘긴다', () => {
  const qb = fakeQb()
  applyFilters(qb as any, 'WhaleAlert', parseFilters('amount_usd:gte:3000000', fakeMeta()))
  assert.equal(qb.calls[0].sql, 'WhaleAlert.amountUsd >= :qf_0')
  assert.deepEqual(qb.calls[0].params, { qf_0: '3000000' })
})

test('applyFilters: in은 스프레드 문법을 쓴다', () => {
  const qb = fakeQb()
  applyFilters(qb as any, 'WhaleAlert', parseFilters('hash:in:a,b', fakeMeta()))
  assert.equal(qb.calls[0].sql, 'WhaleAlert.hash IN (:...qf_0)')
  assert.deepEqual(qb.calls[0].params, { qf_0: ['a', 'b'] })
})

test('applyFilters: isnull은 파라미터 없이 SQL만 만든다', () => {
  const qb = fakeQb()
  applyFilters(qb as any, 'WhaleAlert', parseFilters('deleted_at:isnull:true', fakeMeta()))
  assert.equal(qb.calls[0].sql, 'WhaleAlert.deletedAt IS NULL')
  applyFilters(qb as any, 'WhaleAlert', parseFilters('deleted_at:isnull:false', fakeMeta()))
  assert.equal(qb.calls[1].sql, 'WhaleAlert.deletedAt IS NOT NULL')
})

test('parseSort: 실재하는 컬럼과 방향만 통과시킨다', () => {
  assert.deepEqual(parseSort('amount_usd', 'asc', fakeMeta()), { property: 'amountUsd', order: 'ASC' })
  assert.deepEqual(parseSort('amountUsd', undefined, fakeMeta()), { property: 'amountUsd', order: 'DESC' })
  assert.equal(parseSort(undefined, 'asc', fakeMeta()), null)
  assert.throws(() => parseSort('nope', 'asc', fakeMeta()), FilterError)
  assert.throws(() => parseSort('amountUsd', 'asc; DROP TABLE users', fakeMeta()), FilterError)
})

test('parseJoins: 실재하는 관계만 통과시킨다', () => {
  const meta = fakeMeta({
    name: 'Post',
    relations: [{ propertyName: 'user', inverseEntityMetadata: { relations: [{ propertyName: 'profile', inverseEntityMetadata: { relations: [] } }] } }],
  })
  assert.deepEqual(parseJoins('Post.user', meta, 'Post'), [{ target: 'Post.user', alias: 'tb_0' }])
  assert.throws(() => parseJoins('Post.nope', meta, 'Post'), FilterError)
  assert.throws(() => parseJoins('Other.user', meta, 'Post'), FilterError)
})

test('parseJoins: 앞선 조인이 만든 별칭을 이어받는다', () => {
  const meta = fakeMeta({
    name: 'Post',
    relations: [{ propertyName: 'user', inverseEntityMetadata: { relations: [{ propertyName: 'profile', inverseEntityMetadata: { relations: [] } }] } }],
  })
  assert.deepEqual(parseJoins('Post.user,user.profile', meta, 'Post'), [
    { target: 'Post.user', alias: 'tb_0' },
    { target: 'user.profile', alias: 'tb_1' },
  ])
})

test('parsePositiveInt: 숫자로 강제하고 상한을 건다', () => {
  assert.equal(parsePositiveInt(undefined, { fallback: 0, max: 1000 }), 0)
  assert.equal(parsePositiveInt('20', { fallback: 0, max: 1000 }), 20)
  assert.equal(parsePositiveInt('99999', { fallback: 0, max: 1000 }), 1000)
  assert.throws(() => parsePositiveInt('1; DROP TABLE users', { fallback: 0, max: 1000 }), FilterError)
  assert.throws(() => parsePositiveInt('-1', { fallback: 0, max: 1000 }), FilterError)
  assert.throws(() => parsePositiveInt('1.5', { fallback: 0, max: 1000 }), FilterError)
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../core/query_filter'`

- [ ] **Step 3: 파서 구현**

`core/query_filter.ts`:

```ts
import { EntityMetadata, SelectQueryBuilder } from 'typeorm'

export type FilterOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'isnull'

const OPERATORS: Record<FilterOp, string> = {
  eq: '=',
  ne: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  in: 'IN',
  isnull: 'IS NULL',
}

export const MAX_FILTERS = 10
export const MAX_VALUE_LENGTH = 200
export const MAX_IN_VALUES = 50
export const MAX_JOINS = 10

export class FilterError extends Error {
  status = 400

  constructor(message: string) {
    super(message)
    this.name = 'FilterError'
  }
}

export interface ParsedFilter {
  property: string
  op: FilterOp
  value: string | string[] | boolean | null
}

const isFilterOp = (v: string): v is FilterOp => Object.prototype.hasOwnProperty.call(OPERATORS, v)

/**
 * 엔티티에 실재하는 컬럼만 통과시키고, 프로퍼티명으로 정규화해서 돌려준다.
 * TypeORM QueryBuilder가 alias.propertyName을 실제 컬럼으로 번역해 주기 때문에
 * DB 컬럼명이 아니라 프로퍼티명을 써야 네이밍 전략에 결합되지 않는다.
 */
export const resolveProperty = (meta: EntityMetadata, field: string): string => {
  const column = meta.columns.find(c => c.propertyName === field || c.databaseName === field)
  if (!column) throw new FilterError(`unknown field: ${field}`)
  return column.propertyName
}

// 값에 든 %와 _를 리터럴로 만든다. 이스케이프하지 않으면 사용자가 조건을 임의로 넓힐 수 있다.
const escapeLikeValue = (v: string) => v.replace(/[\\%_]/g, ch => `\\${ch}`)

const parseOne = (entry: unknown, meta: EntityMetadata): ParsedFilter => {
  if (typeof entry !== 'string') throw new FilterError('filter must be a string')

  // 값에 콜론이 들어갈 수 있으므로 앞의 두 개만 나누고 나머지는 값으로 되돌린다.
  const [field, op, ...rest] = entry.split(':')
  const value = rest.join(':')
  if (!field || !op) throw new FilterError(`malformed filter: ${entry}`)
  if (!isFilterOp(op)) throw new FilterError(`unknown operator: ${op}`)

  const property = resolveProperty(meta, field)

  if (op === 'isnull') {
    if (value !== 'true' && value !== 'false') throw new FilterError('isnull takes true or false')
    return { property, op, value: value === 'true' }
  }

  if (value.length > MAX_VALUE_LENGTH) throw new FilterError('filter value too long')

  if (op === 'in') {
    const values = value.split(',').filter(v => v !== '')
    if (values.length === 0) throw new FilterError('in takes at least one value')
    if (values.length > MAX_IN_VALUES) throw new FilterError('too many values for in')
    return { property, op, value: values }
  }

  if (op === 'like') return { property, op, value: `%${escapeLikeValue(value)}%` }

  return { property, op, value }
}

export const parseFilters = (raw: unknown, meta: EntityMetadata): ParsedFilter[] => {
  if (raw === undefined || raw === null || raw === '') return []

  const entries = Array.isArray(raw) ? raw : [raw]
  if (entries.length > MAX_FILTERS) throw new FilterError('too many filters')

  return entries.map(entry => parseOne(entry, meta))
}

export const applyFilters = (qb: SelectQueryBuilder<any>, alias: string, filters: ParsedFilter[]) => {
  filters.forEach((filter, idx) => {
    const target = `${alias}.${filter.property}`
    const key = `qf_${idx}`

    if (filter.op === 'isnull') {
      qb.andWhere(`${target} IS ${filter.value ? '' : 'NOT '}NULL`)
      return
    }
    if (filter.op === 'in') {
      qb.andWhere(`${target} IN (:...${key})`, { [key]: filter.value })
      return
    }
    qb.andWhere(`${target} ${OPERATORS[filter.op]} :${key}`, { [key]: filter.value })
  })
}

export const parseSort = (
  rawSort: unknown,
  rawOrder: unknown,
  meta: EntityMetadata,
): { property: string, order: 'ASC' | 'DESC' } | null => {
  if (rawSort === undefined || rawSort === null || rawSort === '') return null
  if (typeof rawSort !== 'string') throw new FilterError('sort must be a string')

  const order = String(rawOrder || 'desc').toUpperCase()
  if (order !== 'ASC' && order !== 'DESC') throw new FilterError('order must be asc or desc')

  return { property: resolveProperty(meta, rawSort), order }
}

export const parseJoins = (
  raw: unknown,
  meta: EntityMetadata,
  rootAlias: string,
): Array<{ target: string, alias: string }> => {
  if (raw === undefined || raw === null || raw === '') return []
  if (typeof raw !== 'string') throw new FilterError('join must be a string')

  const targets = raw.split(',').map(t => t.trim()).filter(Boolean)
  if (targets.length > MAX_JOINS) throw new FilterError('too many joins')

  // 조인이 진행되면서 새로 참조 가능해지는 별칭을 누적한다.
  // 기존 클라이언트가 'Post.user,user.profile'처럼 관계명으로 이어 받으므로 둘 다 등록한다.
  const known = new Map<string, any>([[rootAlias, meta]])

  return targets.map((target, idx) => {
    const parts = target.split('.')
    if (parts.length !== 2) throw new FilterError(`malformed join: ${target}`)

    const [parentAlias, relationName] = parts
    const parentMeta = known.get(parentAlias)
    if (!parentMeta) throw new FilterError(`unknown join source: ${parentAlias}`)

    const relation = (parentMeta.relations || []).find(r => r.propertyName === relationName)
    if (!relation) throw new FilterError(`unknown relation: ${target}`)

    const alias = `tb_${idx}`
    known.set(alias, relation.inverseEntityMetadata)
    known.set(relationName, relation.inverseEntityMetadata)
    return { target, alias }
  })
}

export const parsePositiveInt = (raw: unknown, { fallback, max }: { fallback: number, max: number }): number => {
  if (raw === undefined || raw === null || raw === '') return fallback

  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) throw new FilterError('must be a non-negative integer')
  return Math.min(n, max)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: 전부 PASS

- [ ] **Step 5: 커밋**

```bash
git add core/query_filter.ts tests/query_filter.test.ts
git commit -m "feat: 쿼리 필터를 화이트리스트 DSL로 파싱하는 모듈을 추가한다

field:op:value 형태만 받고, 엔티티 메타데이터에 실재하는 컬럼과 허용 연산자만
통과시킨 뒤 값을 파라미터로 바인딩한다. 아직 배선하지 않았고 다음 커밋에서
core/orm.ts가 이 모듈을 쓴다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: `querySetter`를 DSL로 재배선

**Files:**
- Modify: `core/orm.ts` (전체 교체)
- Modify: `services/dashboard.ts:22` (내부 호출부의 `where` 문법)
- Modify: `core/response.ts` 확인 (FilterError의 status를 응답에 반영하는지)

**Interfaces:**
- Consumes: Task 2의 `parseFilters`, `applyFilters`, `parseSort`, `parseJoins`, `parsePositiveInt`, `FilterError`
- Produces: `orm.querySetter(c, model)` — 시그니처 동일. 잘못된 필터를 만나면 `FilterError`를 던진다

- [ ] **Step 1: `core/response.ts`의 에러 처리 확인**

Run: `cat core/response.ts`

`failed(e)`가 `e.status`를 읽어 HTTP 상태로 쓰는지 확인한다. 읽지 않는다면 `FilterError`가 500으로 나가므로, 읽도록 고친다(이미 `middlewares.ts`가 `{ message, status }` 형태를 던지고 있으니 그 규약을 따른다).

- [ ] **Step 2: `core/orm.ts` 전체 교체**

```ts
import { dataSource } from '../database'
import IContext from './interfaces/context'
import { applyFilters, parseFilters, parseJoins, parsePositiveInt, parseSort } from './query_filter'

export const MAX_LIMIT = 1000
export const MAX_OFFSET = 1000000

const orm = {
  querySetter: (c: IContext, model) => {
    const q = c.req.query || {}
    const meta = dataSource.getRepository(model).metadata
    const alias = meta.name
    const qb = c.orm.getRepository(model).createQueryBuilder(alias)

    const limit = parsePositiveInt(q['limit'], { fallback: 0, max: MAX_LIMIT })
    if (limit) qb.limit(limit)

    const offset = parsePositiveInt(q['offset'], { fallback: 0, max: MAX_OFFSET })
    if (offset) qb.offset(offset)

    const sort = parseSort(q['sort'], q['order'], meta)
    if (sort) qb.orderBy(`${alias}.${sort.property}`, sort.order)

    applyFilters(qb, alias, parseFilters(q['where'], meta))

    parseJoins(q['join'], meta, alias)
      .forEach(({ target, alias: joinAlias }) => qb.leftJoinAndSelect(target, joinAlias))

    return qb
  },
}

export default orm
```

기존 코드에 있던 `decodeURI(q['where'])`는 뺀다. Fastify가 쿼리스트링을 이미 디코드해서 넘기므로 이중 디코드였다.

- [ ] **Step 3: 내부 호출부를 새 문법으로 고친다**

`services/dashboard.ts:22` — `'amount_usd >= 3000000'`이 더 이상 유효하지 않다.

```ts
whaleAlertService.transactions(c, { limit: 5, where: 'amountUsd:gte:3000000' }),
```

- [ ] **Step 4: 남은 구 문법 호출부가 없는지 확인**

Run: `grep -rn --include=*.ts "where:" --exclude-dir=node_modules --exclude-dir=dist . | grep -v "query_filter\|tests/"`
Expected: `services/dashboard.ts`의 새 문법 한 줄 외에 쿼리 객체로 `where`를 넘기는 곳이 없어야 한다. 있으면 전부 DSL로 고친다.

- [ ] **Step 5: 타입 체크와 테스트**

Run: `npx tsc --noEmit -p tsconfig.json && npm test`
Expected: 에러 없음, 테스트 전부 PASS

- [ ] **Step 6: 커밋**

```bash
git add core/orm.ts core/response.ts services/dashboard.ts
git commit -m "fix: 쿼리스트링이 WHERE 절에 그대로 붙던 SQL 주입 경로를 막는다

querySetter의 ?where=는 임의 SQL을 그대로 받아 왔고, 이 경로가 boards,
notifications, wallets, posts, price_predictions, whale_alerts 같은 인증 없는
공개 엔드포인트에서 쓰였다. field:op:value DSL만 받도록 바꾸고 limit/offset도
숫자로 강제한 뒤 상한을 건다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: 공통 계층의 SQL 보간 제거

`core/controller.ts`와 `entities/message.ts`는 여러 엔드포인트가 공유하므로 먼저 고친다. `core/controller.ts:82`의 `IN (:id)`는 보안 문제가 아니라 **PostgreSQL에서 아예 깨지는 버그**다 — mysql2는 배열 파라미터를 펼쳐 주지만 pg는 그러지 않는다. TypeORM의 스프레드 문법 `IN (:...ids)`가 맞다.

**Files:**
- Modify: `core/controller.ts:31`, `core/controller.ts:38`, `core/controller.ts:82`
- Modify: `entities/message.ts:9`

- [ ] **Step 1: `core/controller.ts`의 `detail` 수정**

```ts
  detail: async (c: IContext) => {
    const entityName = c.orm.getRepository(model).metadata.name
    const qs = orm.querySetter(c, model)
    if (withDeleted) qs.withDeleted()

    try {
      const data = await qs.where(`${entityName}.id = :id`, { id: c.req.params['id'] }).getOne()
      c.res.asJSON(data)
    } catch (e) {
      c.res.failed(e)
    }
  },
```

- [ ] **Step 2: `core/controller.ts`의 `delete` 수정**

```ts
  delete: async (c: IContext) => {
    const o = orm.querySetter(c, model).where('id = :id', { id: c.req.params['id'] })
    const promise = useSoftDelete ? o.softDelete() : o.delete()
    try {
      await promise.execute()
      c.res.success()
    } catch (e) {
      c.res.failed(e)
    }
  },
```

- [ ] **Step 3: `core/controller.ts`의 `loadChildren` 수정**

82행의 `IN (:id)`를 스프레드 문법으로 바꾼다.

```ts
    const children = await qs
      .where(`${childModelName}.${modelName.toLowerCase()}.id IN (:...modelIds)`, { modelIds })
      .getMany()
```

- [ ] **Step 4: `entities/message.ts`의 `populateReactions` 수정**

`messageIds`가 비면 `IN ()`이 되어 문법 오류가 나므로 조기 반환도 함께 넣는다.

```ts
export const populateReactions = async (messages: Array<Message>) => {
  const messageIds = messages.map(message => message.id)
  if (messageIds.length === 0) return

  const reactions = await dataSource.getRepository(Reaction).createQueryBuilder()
    .where('message_id IN (:...messageIds)', { messageIds })
    .getMany()
```

- [ ] **Step 5: 타입 체크**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add core/controller.ts entities/message.ts
git commit -m "fix: 공통 CRUD 계층의 SQL 문자열 보간을 파라미터 바인딩으로 바꾼다

loadChildren의 IN (:id)는 배열 파라미터를 mysql2가 펼쳐 줘서 동작하던 것이라
pg 드라이버에서는 깨진다. TypeORM 스프레드 문법으로 바로잡는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: 컨트롤러의 SQL 보간 제거

**Files:**
- Modify: `controllers/auth_controller.ts:38`
- Modify: `controllers/admin_controller.ts:53`, `controllers/admin_controller.ts:101`
- Modify: `controllers/reaction_controller.ts` (4곳 + 3개 조건식)
- Modify: `controllers/post_controller.ts:142`
- Modify: `controllers/price_prediction_controller.ts:74`
- Modify: `controllers/notification_controller.ts:8`
- Modify: `chat/controllers.ts:292`

- [ ] **Step 1: `auth_controller.ts`의 로그인 조회 수정**

로그인 경로라 우선순위가 높다.

```ts
  const existingUser = await c.orm.getRepository(User)
    .createQueryBuilder()
    .where('email = :email', { email })
    .leftJoinAndSelect('User.profile', 'profile')
    .getOne()
```

- [ ] **Step 2: `admin_controller.ts` 수정**

53행 — 큰따옴표 문자열 리터럴은 PostgreSQL에서 식별자로 해석되므로 문법 자체가 바뀌어야 한다.

```ts
      if (c.req.body['deleteMessages'] === 'ok') {
        await c.orm.createQueryBuilder()
          .where('ip = :ip', { ip: c.req.body['ip'] })
          .softDelete().from(Message).execute()
      }
```

101행:

```ts
      .where('Post.id = :id', { id: c.req.params['id'] }).getOneOrFail()
```

- [ ] **Step 3: `reaction_controller.ts` 수정**

같은 모양이 세 번(`post`/`reply`/`message`) 반복된다. 각각의 `query` 문자열과 뒤따르는 delete를 아래 형태로 바꾼다. `post` 버전:

```ts
      const user = await helpers.jwt.mustUser(c)
      try {
        const qb = c.orm.getRepository(Reaction).createQueryBuilder()
          .where('type = :type', { type: c.req.body['type'] })
          .andWhere('post_id = :postId', { postId: c.req.body['postId'] })

        // user_id가 null이면 ip를 기준으로, user_id가 있으면 user_id를 기준으로 중복방지.
        if (user) qb.andWhere('user_id = :userId', { userId: user['id'] })
        else qb.andWhere('ip = :ip', { ip: c.req.ip })

        const result = await qb.getOne()
        if (result) {
          await c.orm.getRepository(Reaction).createQueryBuilder()
            .where('id = :id', { id: result.id }).delete().execute()
        } else await c.orm.getRepository(Reaction).insert({
```

`reply` 버전은 `post_id = :postId`를 `reply_id = :replyId`(`c.req.body['replyId']`)로, `message` 버전은 `message_id = :messageId`(`c.req.body['messageId']`)로 바꾼 것 외에 동일하다.

`afterReact`(11행)도 함께 고친다.

```ts
    const reactions = await c.orm.getRepository(Reaction).createQueryBuilder()
      .where('message_id = :messageId', { messageId: c.req.body['messageId'] })
      .getMany()
```

- [ ] **Step 4: `post_controller.ts`와 `price_prediction_controller.ts` 수정**

`post_controller.ts:142`:

```ts
        .where('Post.sharing_key = :sharingKey', { sharingKey: c.req.params['sharingKey'] })
        .andWhere('Post.deleted_at IS NULL')
```

`price_prediction_controller.ts:74`:

```ts
        .where('PricePrediction.sharing_key = :sharingKey', { sharingKey: c.req.params['sharingKey'] })
        .andWhere('PricePrediction.deleted_at IS NULL')
```

- [ ] **Step 5: `notification_controller.ts` 수정**

`active`는 PostgreSQL에서 boolean이라 `= 1`이 타입 에러가 된다. `= true`는 MySQL에서도 동작하므로 지금 바꿔도 안전하다.

```ts
      const [data, total] = await orm.querySetter(c, Notification).where('active = true').getManyAndCount()
```

- [ ] **Step 6: `chat/controllers.ts` 수정**

292행:

```ts
      if (cursor) qb.where('Message.id < :cursor', { cursor })
```

- [ ] **Step 7: 남은 보간이 없는지 확인**

Run:
```bash
grep -rn --include=*.ts -E '(where|andWhere|orWhere)\(`[^`]*\$\{' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=migrations .
```
Expected: `services/post.ts`와 `services/price_prediction.ts`의 LIKE만 남는다 (Task 6에서 처리)

- [ ] **Step 8: 타입 체크**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음

- [ ] **Step 9: 커밋**

```bash
git add controllers/ chat/controllers.ts
git commit -m "fix: 컨트롤러의 SQL 문자열 보간을 파라미터 바인딩으로 바꾼다

로그인 조회(email), 어드민 게시글/메시지 조회, 반응 토글, 공유키 조회, 채팅
커서가 대상이다. 어드민의 ip = \"...\"는 큰따옴표라 PostgreSQL에서는 식별자로
해석되고, notifications.active = 1은 boolean 타입 에러가 난다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: 서비스 계층과 대시보드 원시 SQL 정리

**Files:**
- Modify: `services/post.ts:38-46`
- Modify: `services/price_prediction.ts:31-36`
- Modify: `controllers/dashboard_controller.ts` (`activityQuery`)

- [ ] **Step 1: `services/post.ts`의 검색 조건 수정**

검색어가 그대로 SQL에 들어가고 있었다. `LIKE`는 이 단계에서 유지하고 Task 8에서 `ILIKE`로 바꾼다 — MySQL에서 아직 동작해야 하기 때문이다.

```ts
      const keyword = (c.req.query['query'] || '').split('=')[1]
      if (keyword) {
        // 값에 든 %와 _를 리터럴로 만든다. 이스케이프하지 않으면 조건이 임의로 넓어진다.
        const pattern = `%${keyword.replace(/[\\%_]/g, ch => `\\${ch}`)}%`
        qb.andWhere(new Brackets(subQb => subQb
          .where('Post.nickname LIKE :pattern', { pattern })
          .orWhere('profile.nickname LIKE :pattern', { pattern })
          .orWhere('Post.title LIKE :pattern', { pattern })
          .orWhere('Post.content LIKE :pattern', { pattern })
        ))
      }
```

- [ ] **Step 2: `services/price_prediction.ts`의 검색 조건 수정**

Run: `sed -n '25,40p' services/price_prediction.ts` 로 현재 형태를 먼저 확인한 뒤, 위와 같은 방식으로 `PricePrediction.nickname`과 `profile.nickname`을 파라미터화한다.

```ts
        const pattern = `%${keyword.replace(/[\\%_]/g, ch => `\\${ch}`)}%`
        qb.andWhere(new Brackets(subQb => subQb
          .where('PricePrediction.nickname LIKE :pattern', { pattern })
          .orWhere('profile.nickname LIKE :pattern', { pattern })
        ))
```

- [ ] **Step 3: `dashboard_controller.ts`의 `activityQuery` 수정**

테이블명은 현재 코드 내부 상수에서만 오지만, 향후 유입 경로가 생겨도 막히도록 화이트리스트 검증을 명시한다. 날짜는 파라미터로 넘긴다. `pg`는 `$1` 스타일 자리표시자를 쓴다.

```ts
const ACTIVITY_TABLES = ['messages', 'posts', 'replies'] as const
type ActivityTable = typeof ACTIVITY_TABLES[number]

const activityQuery = ({ tablename, start, end }: { tablename: string, start?: string, end?: string }) => {
  // 테이블명은 자리표시자로 넘길 수 없으므로 화이트리스트로 막는다.
  if (!ACTIVITY_TABLES.includes(tablename as ActivityTable)) {
    return Promise.reject({ message: 'INVALID_TABLE', status: 400 })
  }
  if (start && !helpers.dayjs(start).isValid()) return Promise.reject({ message: 'INVALID_DATE', status: 400 })
  if (end && !helpers.dayjs(end).isValid()) return Promise.reject({ message: 'INVALID_DATE', status: 400 })

  const params: string[] = []
  let base = `
    SELECT
      COUNT(*) AS count,
      MAX(p.nickname) AS nickname,
      MAX(p.image) AS image,
      MIN(${tablename}.created_at) AS first_seen,
      MAX(${tablename}.created_at) AS last_seen
    FROM ${tablename}
    LEFT JOIN users as u ON u.id = ${tablename}.user_id
    LEFT JOIN profiles as p ON p.user_id = u.id
    WHERE ${tablename}.user_id IS NOT NULL
  `

  if (start) {
    params.push(start)
    base += ` AND ${tablename}.created_at >= $${params.length}`
  }
  if (end) {
    params.push(end)
    base += ` AND ${tablename}.created_at < $${params.length}`
  }

  return {
    sql: base + `
      GROUP BY ${tablename}.user_id
      ORDER BY COUNT(*) DESC
    `,
    params,
  }
}
```

호출부도 함께 바꾼다.

```ts
  activities: async (c: IContext) => {
    try {
      const data = await Promise.all(ACTIVITY_TABLES.map(async tablename => {
        const { sql, params } = await activityQuery({
          tablename,
          start: c.req.query['start'],
          end: c.req.query['end'],
        })
        return dataSource.query(sql, params)
      }))
      const aggregated = ACTIVITY_TABLES.map((key, idx) => ({ key, data: data[idx] }))
      c.res.success(aggregated)
    } catch (e) {
      c.res.failed(e)
    }
  },
```

- [ ] **Step 4: 보간이 전부 사라졌는지 확인**

Run:
```bash
grep -rn --include=*.ts -E '(where|andWhere|orWhere)\(`[^`]*\$\{' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=migrations .
```
Expected: 출력 없음

- [ ] **Step 5: 타입 체크와 테스트**

Run: `npx tsc --noEmit -p tsconfig.json && npm test`
Expected: 에러 없음, 테스트 전부 PASS

- [ ] **Step 6: 커밋**

```bash
git add services/post.ts services/price_prediction.ts controllers/dashboard_controller.ts
git commit -m "fix: 검색어와 대시보드 날짜가 SQL에 그대로 들어가던 문제를 고친다

게시글/가격예측 검색의 LIKE 패턴을 파라미터로 넘기고 값의 와일드카드를
이스케이프한다. 대시보드 집계는 날짜를 자리표시자로 넘기고 테이블명에
화이트리스트를 건다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: 스키마 기준선 SQL

라이브 MySQL에서 `mysqldump --no-data`로 뜬 구조를 PostgreSQL DDL로 옮긴다. 사람이 읽고 검토할 수 있는 한 장이어야 하고, 복구는 `psql -f` 한 줄이어야 한다.

**Files:**
- Create: `schema/001_baseline.sql`
- Create: `schema/README.md`
- Delete: `migrations/` (31개 파일)

**Interfaces:**
- Produces: `schema/001_baseline.sql` — 21개 중 `migrations`를 뺀 20개 테이블. 이후 변경은 `002_*.sql`로 붙인다

- [ ] **Step 1: 기준선 DDL 작성**

`schema/001_baseline.sql`:

```sql
-- 2026-08-19 시점 운영 MySQL(coinsect)의 구조를 PostgreSQL로 옮긴 기준선.
--
-- 이 파일이 스키마의 유일한 진실이다. TypeORM 마이그레이션은 폐기했다 - migrations
-- 테이블(30행)과 파일(31개)이 이미 어긋나 있어 추적 가치가 없었다.
-- 이후 변경은 002_*.sql, 003_*.sql로 붙인다.
--
-- 적용: psql -U coinsect -d coinsect -f schema/001_baseline.sql

SET client_min_messages = warning;
SET timezone = 'UTC';

-- MySQL의 ON UPDATE CURRENT_TIMESTAMP(6)에 대응하는 문법이 PostgreSQL에는 없다.
-- TypeORM의 @UpdateDateColumn은 save() 경로에서만 확실히 동작하는데, 델타 동기화가
-- updated_at을 기준으로 삼으므로 DB 레벨 보장이 필요하다.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- 사용자

CREATE TABLE users (
  id              integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  email           varchar(255) NOT NULL,
  password        varchar(255),
  phone           varchar(255),
  role            varchar(255) NOT NULL DEFAULT 'user',
  auth            varchar(255),
  sign_in_count   integer NOT NULL DEFAULT 0,
  last_sign_in    timestamptz,
  last_sign_in_ip varchar(255),
  deactivated_at  timestamptz
);

CREATE TABLE profiles (
  id         integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  birthday   timestamptz,
  name       varchar(255),
  nickname   varchar(255) NOT NULL,
  user_id    integer,
  gender     varchar(255),
  image      varchar(255),
  CONSTRAINT uq_profiles_user UNIQUE (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE auth_tokens (
  id         integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  token      varchar(255) NOT NULL,
  provider   varchar(255) NOT NULL,
  user_id    integer,
  CONSTRAINT uq_auth_tokens_user UNIQUE (user_id),
  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_securities (
  id                           integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),
  deleted_at                   timestamptz,
  password_reset_token         varchar(255),
  password_reset_token_sent_at timestamptz,
  user_id                      integer,
  CONSTRAINT uq_user_securities_user UNIQUE (user_id),
  CONSTRAINT fk_user_securities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE banned_users (
  id         integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  ip         varchar(255),
  reason     text,
  until      timestamptz DEFAULT now(),
  user_id    integer,
  token      varchar(255),
  CONSTRAINT uq_banned_users_user UNIQUE (user_id),
  CONSTRAINT fk_banned_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------- 게시판

CREATE TABLE boards (
  id          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  type        varchar(255),
  title       varchar(255),
  description varchar(255)
);

-- posts.user_id에는 FK가 없다. 엔티티가 createForeignKeyConstraints: false로 선언해
-- 운영 MySQL에도 제약이 걸려 있지 않다.
CREATE TABLE posts (
  id          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  title       varchar(255),
  content     text NOT NULL,
  views       integer NOT NULL DEFAULT 0,
  nickname    varchar(255) NOT NULL,
  ip          varchar(255),
  user_id     integer,
  board_id    integer,
  sharing_key varchar(255),
  password    varchar(255),
  post_type   varchar(255) NOT NULL DEFAULT 'normal',
  last_edit   timestamptz,
  tags        varchar(255),
  CONSTRAINT fk_posts_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL
);
CREATE INDEX idx_posts_board_fk ON posts (board_id);
CREATE INDEX idx_posts_sharing_key ON posts (sharing_key);
CREATE INDEX idx_posts_main ON posts (deleted_at, created_at DESC, board_id);
CREATE INDEX idx_board_posts ON posts (board_id, deleted_at, created_at DESC);

CREATE TABLE replies (
  id         integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  content    text NOT NULL,
  nickname   varchar(255) NOT NULL,
  ip         varchar(255),
  password   varchar(255),
  post_id    integer,
  parent_id  integer,
  user_id    integer,
  last_edit  timestamptz,
  CONSTRAINT fk_replies_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  CONSTRAINT fk_replies_parent FOREIGN KEY (parent_id) REFERENCES replies(id) ON DELETE SET NULL
);
CREATE INDEX idx_replies_post ON replies (post_id);
CREATE INDEX idx_replies_parent ON replies (parent_id);

-- ---------------------------------------------------------------- 채팅
--
-- messages_202605는 2026-05-20에 messages를 rename하고 새 messages를 만든 흔적이다.
-- 두 테이블의 id 범위가 1부터 겹친다(messages 1~1944, messages_202605 1~878422).
-- 코드에서 아카이브를 읽는 곳은 없지만 reactions.message_id의 FK 대상이므로
-- 운영과 1:1로 보존한다.

CREATE TABLE messages_202605 (
  id              integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  ip              varchar(255) NOT NULL,
  type            varchar(255) NOT NULL,
  text            varchar(255) NOT NULL,
  nickname        varchar(255) NOT NULL,
  image           varchar(255),
  token           varchar(255) NOT NULL,
  ts              timestamptz NOT NULL,
  num_connections integer NOT NULL,
  meta            text,
  user_id         integer,
  CONSTRAINT fk_messages_202605_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_messages_202605_user ON messages_202605 (user_id);

-- 운영 MySQL의 messages에는 user_id FK가 없다(rename 때 제약이 아카이브로 따라갔다).
CREATE TABLE messages (
  id              integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  ip              varchar(255) NOT NULL,
  type            varchar(255) NOT NULL,
  text            varchar(255) NOT NULL,
  nickname        varchar(255) NOT NULL,
  image           varchar(255),
  token           varchar(255) NOT NULL,
  ts              timestamptz NOT NULL,
  num_connections integer NOT NULL,
  meta            text,
  user_id         integer
);
CREATE INDEX idx_messages_user ON messages (user_id);

CREATE TABLE reactions (
  id         integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  type       varchar(255) NOT NULL,
  nickname   varchar(255),
  ip         varchar(255) NOT NULL,
  post_id    integer,
  user_id    integer,
  reply_id   integer,
  message_id integer,
  CONSTRAINT fk_reactions_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  CONSTRAINT fk_reactions_reply FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE SET NULL,
  -- 운영 MySQL과 동일하게 아카이브 테이블을 가리킨다. 의도적인 1:1 보존이므로
  -- 여기서 messages로 바꾸지 말 것 - 별개 작업이다.
  CONSTRAINT fk_reactions_message FOREIGN KEY (message_id) REFERENCES messages_202605(id) ON DELETE SET NULL
);
CREATE INDEX idx_reactions_post ON reactions (post_id);
CREATE INDEX idx_reactions_reply ON reactions (reply_id);
CREATE INDEX idx_reactions_message ON reactions (message_id);

-- ---------------------------------------------------------------- 온체인

CREATE TABLE blockchains (
  id          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  name        varchar(255) NOT NULL,
  symbol      varchar(255) NOT NULL,
  icon        varchar(255) NOT NULL,
  explore_url varchar(255),
  description varchar(255)
);

CREATE TABLE wallets (
  id            integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  address       varchar(255) NOT NULL,
  memo          varchar(255),
  description   varchar(255),
  blockchain_id integer,
  balance       numeric(36,18),
  CONSTRAINT fk_wallets_blockchain FOREIGN KEY (blockchain_id) REFERENCES blockchains(id) ON DELETE SET NULL
);
CREATE INDEX idx_wallets_blockchain ON wallets (blockchain_id);

-- whale_alerts에는 id도 created_at/updated_at도 없다. PK는 hash다.
-- 운영에는 컬럼 구성이 완전히 동일한 인덱스가 둘(idx_amount_timestamp_owner,
-- idx_whale_main) 있고 PK와 중복인 unique 인덱스도 있었다. 하나만 남긴다.
CREATE TABLE whale_alerts (
  hash              varchar(255) PRIMARY KEY,
  amount            numeric(36,18),
  amount_usd        numeric(20,2),
  from_address      varchar(255),
  blockchain        varchar(255),
  symbol            varchar(255),
  from_owner        varchar(255),
  from_owner_type   varchar(255),
  to_address        varchar(255),
  to_owner          varchar(255),
  to_owner_type     varchar(255),
  transaction_count integer,
  transaction_type  varchar(255),
  "timestamp"       integer
);
CREATE INDEX idx_whale_main ON whale_alerts (amount_usd, "timestamp" DESC, from_owner_type, to_owner_type);

-- ---------------------------------------------------------------- 콘텐츠

CREATE TABLE images (
  id          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  key         varchar(255) NOT NULL,
  type        varchar(255),
  description varchar(255)
);

CREATE TABLE persons (
  id          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  name        varchar(255) NOT NULL,
  bio         text,
  description text,
  sharing_key varchar(255) NOT NULL
);
CREATE INDEX idx_persons_sharing_key ON persons (sharing_key);

CREATE TABLE persons_images (
  persons_id integer NOT NULL,
  images_id  integer NOT NULL,
  PRIMARY KEY (persons_id, images_id),
  CONSTRAINT fk_persons_images_person FOREIGN KEY (persons_id) REFERENCES persons(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_persons_images_image FOREIGN KEY (images_id) REFERENCES images(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_persons_images_person ON persons_images (persons_id);
CREATE INDEX idx_persons_images_image ON persons_images (images_id);

CREATE TABLE bad_words (
  id          integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  type        varchar(255) NOT NULL DEFAULT 'insulting',
  word        varchar(255) NOT NULL,
  alternative varchar(255)
);

-- MySQL의 tinyint NOT NULL DEFAULT '0'을 boolean으로 옮긴다.
CREATE TABLE notifications (
  id         integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  text       varchar(255) NOT NULL,
  type       varchar(255) NOT NULL,
  link       varchar(255),
  active     boolean NOT NULL DEFAULT false
);

CREATE TABLE price_predictions (
  id             integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  user_id        integer,
  nickname       varchar(255) NOT NULL,
  ip             varchar(255),
  sharing_key    varchar(255),
  password       varchar(255),
  ticker         varchar(255) NOT NULL,
  price_snapshot numeric(36,18) NOT NULL,
  time_from      timestamptz,
  time_to        timestamptz,
  price_min      numeric(36,18),
  price_max      numeric(36,18)
);
CREATE INDEX idx_price_predictions_sharing_key ON price_predictions (sharing_key);

-- ---------------------------------------------------------------- 트리거

CREATE TRIGGER trg_users_updated_at             BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at          BEFORE UPDATE ON profiles          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_auth_tokens_updated_at       BEFORE UPDATE ON auth_tokens       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_securities_updated_at   BEFORE UPDATE ON user_securities   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_banned_users_updated_at      BEFORE UPDATE ON banned_users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_boards_updated_at            BEFORE UPDATE ON boards            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_posts_updated_at             BEFORE UPDATE ON posts             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_replies_updated_at           BEFORE UPDATE ON replies           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_messages_updated_at          BEFORE UPDATE ON messages          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_messages_202605_updated_at   BEFORE UPDATE ON messages_202605   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reactions_updated_at         BEFORE UPDATE ON reactions         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blockchains_updated_at       BEFORE UPDATE ON blockchains       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wallets_updated_at           BEFORE UPDATE ON wallets           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_images_updated_at            BEFORE UPDATE ON images            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_persons_updated_at           BEFORE UPDATE ON persons           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bad_words_updated_at         BEFORE UPDATE ON bad_words         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notifications_updated_at     BEFORE UPDATE ON notifications     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_price_predictions_updated_at BEFORE UPDATE ON price_predictions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: `schema/README.md` 작성**

```markdown
# 스키마

`001_baseline.sql`이 스키마의 유일한 진실이다. TypeORM 마이그레이션은 2026-08-19에
폐기했다 — `migrations` 테이블(30행)과 파일(31개)이 이미 어긋나 있어 추적 가치가 없었다.

## 새 DB 만들기

```bash
sudo -u postgres psql -c "CREATE ROLE coinsect LOGIN PASSWORD '...'"
sudo -u postgres psql -c "CREATE DATABASE coinsect OWNER coinsect"
psql -h localhost -U coinsect -d coinsect -f schema/001_baseline.sql
```

## 스키마 바꾸기

`002_*.sql`, `003_*.sql`로 번호를 이어 붙인다. `001_baseline.sql`은 수정하지 않는다.
엔티티도 함께 고쳐야 한다 — TypeORM은 `synchronize: false`라 스키마를 만들지 않고
읽기만 한다.
```

- [ ] **Step 3: 문법 검증**

빈 DB에 실제로 적용해 본다. 서버에서:

```bash
ssh -i ~/.ssh/kispi-seoul.pem ubuntu@webserver.coinsect.io \
  "sudo -u postgres psql -c 'CREATE DATABASE schema_check'"
scp -i ~/.ssh/kispi-seoul.pem schema/001_baseline.sql ubuntu@webserver.coinsect.io:/tmp/
ssh -i ~/.ssh/kispi-seoul.pem ubuntu@webserver.coinsect.io \
  "sudo -u postgres psql -d schema_check -v ON_ERROR_STOP=1 -f /tmp/001_baseline.sql && echo BASELINE_OK"
```

Expected: `BASELINE_OK`. 에러가 나면 고치고 다시 돌린다.

- [ ] **Step 4: 테이블 수 대조**

```bash
ssh -i ~/.ssh/kispi-seoul.pem ubuntu@webserver.coinsect.io \
  "sudo -u postgres psql -d schema_check -tAc \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\""
```
Expected: `20` (MySQL 21개에서 `migrations` 제외)

- [ ] **Step 5: 검증용 DB 정리**

```bash
ssh -i ~/.ssh/kispi-seoul.pem ubuntu@webserver.coinsect.io \
  "sudo -u postgres psql -c 'DROP DATABASE schema_check'"
```

- [ ] **Step 6: 마이그레이션 디렉터리 삭제 후 커밋**

```bash
git rm -r migrations/
git add schema/
git commit -m "refactor: 마이그레이션을 버리고 현재 상태 스키마 스냅샷을 기준선으로 잡는다

migrations 테이블(30행)과 파일(31개)이 이미 어긋나 있어 추적 가치가 없었다.
기준선은 엔티티가 아니라 운영 MySQL에서 뜬 DDL을 옮긴 것이다.

시각 컬럼은 전부 timestamptz다. timestamp without time zone을 쓰면
node-postgres가 값을 Node 프로세스 로컬 시각으로 파싱해 전 데이터가 조용히
밀린다. ON UPDATE CURRENT_TIMESTAMP는 대응 문법이 없어 트리거로 옮겼다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: 드라이버 전환

코드 수정이 전부 끝난 뒤 드라이버를 바꾼다. 여기서만 PostgreSQL 전용 문법(`ILIKE`)이 들어간다.

**Files:**
- Modify: `database.ts`
- Modify: `ormconfig.sample.ts`
- Modify: `package.json` (dependencies)
- Modify: `services/post.ts`, `services/price_prediction.ts` (LIKE → ILIKE)
- Modify: `.github/workflows/deploy.yml` (ormconfig 검증 단계 주석)

**Interfaces:**
- Consumes: Task 6의 파라미터화된 LIKE 조건

- [ ] **Step 1: 의존성 교체**

```bash
npm uninstall mysql2 && npm install pg && npm install --save-dev @types/pg
```

`mysql2`는 런타임에서 빠진다. 이관 도구(Task 9)는 자체 `package.json`을 갖는다.

- [ ] **Step 2: `database.ts` 수정**

```ts
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import options from './ormconfig'

export const dataSource = new DataSource({
  type: 'postgres',
  ...options,
})
```

- [ ] **Step 3: `ormconfig.sample.ts` 수정**

```ts
const { SnakeNamingStrategy } = require('typeorm-naming-strategies')

const p = process.env.NODE_ENV === 'production'

const entitiesDir = p ? 'dist/entities' : 'entities'
const subscribersDir = p ? 'dist/subscribers' : 'subscribers'

export default {
  host: 'localhost',
  port: 5432,
  username: '',
  password: '',
  database: '',
  logging: false,
  entities: [`${entitiesDir}/**/*{.js,.ts}`],
  subscribers: [`${subscribersDir}/**/*{.js,.ts}`,],
  // 시각 컬럼은 전부 timestamptz다. 세션 타임존을 UTC로 못 박아 서버 로케일에
  // 관계없이 같은 값을 읽게 한다.
  extra: { options: '-c timezone=UTC' },
  namingStrategy: new SnakeNamingStrategy(),
}
```

`charset`(PostgreSQL에서 무의미)과 `timezone`(mysql2 전용 옵션), `migrations` 글롭이 빠졌다.

- [ ] **Step 4: 로컬 `ormconfig.ts`도 같은 형태로 고친다**

gitignore 대상이라 커밋되지 않지만 로컬 개발과 다음 단계 검증에 필요하다. 호스트는 `webserver.coinsect.io`, 포트 5432, 사용자/DB 모두 `coinsect`.

- [ ] **Step 5: LIKE를 ILIKE로 바꾼다**

MySQL의 `utf8mb4_0900_ai_ci` 콜레이션에서 `LIKE`는 대소문자를 구분하지 않았다. PostgreSQL의 `LIKE`는 구분하므로 그대로 두면 검색 결과가 줄어든다.

`services/post.ts`:

```ts
        qb.andWhere(new Brackets(subQb => subQb
          .where('Post.nickname ILIKE :pattern', { pattern })
          .orWhere('profile.nickname ILIKE :pattern', { pattern })
          .orWhere('Post.title ILIKE :pattern', { pattern })
          .orWhere('Post.content ILIKE :pattern', { pattern })
        ))
```

`services/price_prediction.ts`도 같은 방식으로 두 줄을 바꾼다.

- [ ] **Step 6: 배포 워크플로우 주석 갱신**

`.github/workflows/deploy.yml`의 "Verify ormconfig.ts survived shell expansion" 단계는 `entitiesDir}/**` 글롭을 검사한다. 새 ormconfig에도 이 글롭이 남아 있으므로 검사 자체는 그대로 유효하다. 주석에서 `migrations` 언급만 정리한다.

- [ ] **Step 7: 빌드와 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 테스트 전부 PASS

- [ ] **Step 8: 커밋**

```bash
git add database.ts ormconfig.sample.ts package.json package-lock.json services/ .github/workflows/deploy.yml
git commit -m "feat: DB 드라이버를 mysql2에서 pg로 바꾼다

세션 타임존을 UTC로 못 박는다. 시각 컬럼이 전부 timestamptz라 서버 로케일에
관계없이 같은 값을 읽어야 한다.

검색 조건은 LIKE에서 ILIKE로 바꾼다. MySQL의 utf8mb4_0900_ai_ci에서는 LIKE가
대소문자를 구분하지 않았지만 PostgreSQL은 구분해서, 그대로 두면 검색 결과가 준다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: 이관 도구

서버에서 단독 실행되는 일회성 운영 스크립트다. 배포 산출물과 무관하게 자체 `package.json`을 갖고, 빌드 단계 없이 도는 ESM `.mjs`로 쓴다.

**Files:**
- Create: `tools/migrate/package.json`
- Create: `tools/migrate/schema.mjs` (테이블 메타 조회)
- Create: `tools/migrate/copy.mjs` (전체/델타 이관)
- Create: `tools/migrate/verify.mjs` (대조)
- Create: `tools/migrate/README.md`

**Interfaces:**
- Produces:
  - `node copy.mjs --mode=full` — 전체 이관 후 시퀀스 재설정
  - `node copy.mjs --mode=delta --since=<ISO8601>` — 델타 동기화 후 시퀀스 재설정
  - `node verify.mjs` — 행 수/경계값 대조, 불일치 시 exit 1
- 환경변수: `MYSQL_URL`, `PG_URL`

- [ ] **Step 1: `tools/migrate/package.json` 작성**

```json
{
  "name": "coinsect-migrate",
  "private": true,
  "type": "module",
  "description": "MySQL -> PostgreSQL 일회성 이관 도구. 서버에서 단독 실행한다.",
  "dependencies": {
    "mysql2": "^3.23.3",
    "pg": "^8.13.1"
  }
}
```

- [ ] **Step 2: `tools/migrate/schema.mjs` 작성**

테이블 목록과 컬럼 구성을 하드코딩하지 않고 두 DB에서 읽는다. 스키마가 바뀌어도 도구를 고칠 필요가 없다.

```js
// 이관 대상 테이블. FK 의존 순서대로 넣는다 - 부모가 먼저 들어가야 자식의 FK가 통과한다.
// migrations는 옮기지 않는다(TypeORM 추적 테이블이고 기준선에서 폐기했다).
export const TABLES = [
  'users',
  'profiles',
  'auth_tokens',
  'user_securities',
  'banned_users',
  'boards',
  'posts',
  'replies',
  'messages_202605',
  'messages',
  'reactions',
  'blockchains',
  'wallets',
  'whale_alerts',
  'images',
  'persons',
  'persons_images',
  'bad_words',
  'notifications',
  'price_predictions',
]

// PostgreSQL 쪽 컬럼 구성을 읽어 온다. 이관은 이 목록을 기준으로 한다 -
// MySQL에만 있고 PostgreSQL에 없는 컬럼은 옮기지 않는다는 뜻이다.
export const describeTable = async (pg, table) => {
  const { rows } = await pg.query(
    `SELECT column_name, data_type, is_identity
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  )
  if (rows.length === 0) throw new Error(`PostgreSQL에 ${table}이 없다`)

  const columns = rows.map(r => r.column_name)
  return {
    table,
    columns,
    // 델타 판정 기준. updated_at이 없으면 전체를 다시 훑는다.
    hasUpdatedAt: columns.includes('updated_at'),
    // 충돌 처리 키. id가 있으면 upsert, 없으면 PK로 무시.
    conflictKey: columns.includes('id') ? 'id' : (table === 'whale_alerts' ? 'hash' : null),
    hasIdentity: rows.some(r => r.is_identity === 'YES'),
    booleanColumns: rows.filter(r => r.data_type === 'boolean').map(r => r.column_name),
    timestampColumns: rows
      .filter(r => r.data_type === 'timestamp with time zone')
      .map(r => r.column_name),
  }
}
```

- [ ] **Step 3: `tools/migrate/copy.mjs` 작성**

```js
import mysql from 'mysql2/promise'
import pkg from 'pg'
import { TABLES, describeTable } from './schema.mjs'

const { Client } = pkg
const BATCH = 1000

const arg = name => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

// MySQL을 dateStrings로 읽으므로 시각은 'YYYY-MM-DD HH:mm:ss.SSSSSS' 문자열로 온다.
// 여기에 Z를 붙여 UTC임을 못 박는다. 드라이버의 타임존 해석에 절대 의존하지 않는다.
const toUtc = v => (v === null || v === undefined ? null : `${String(v).replace(' ', 'T')}Z`)

// MySQL의 tinyint(0/1)를 PostgreSQL boolean으로 옮긴다.
const toBool = v => (v === null || v === undefined ? null : Number(v) === 1)

const buildRow = (row, meta) => meta.columns.map(col => {
  const value = row[col]
  if (meta.timestampColumns.includes(col)) return toUtc(value)
  if (meta.booleanColumns.includes(col)) return toBool(value)
  return value === undefined ? null : value
})

const insertSql = (meta, mode) => {
  const cols = meta.columns.map(c => `"${c}"`).join(', ')
  const placeholders = (rowIdx) =>
    `(${meta.columns.map((_, i) => `$${rowIdx * meta.columns.length + i + 1}`).join(', ')})`

  return rowCount => {
    const values = Array.from({ length: rowCount }, (_, i) => placeholders(i)).join(', ')
    let sql = `INSERT INTO "${meta.table}" (${cols}) VALUES ${values}`

    if (!meta.conflictKey) return sql

    if (mode === 'delta' && meta.hasUpdatedAt) {
      // 델타는 INSERT와 UPDATE(소프트삭제 포함)를 한 번에 처리한다.
      const updates = meta.columns
        .filter(c => c !== meta.conflictKey)
        .map(c => `"${c}" = EXCLUDED."${c}"`)
        .join(', ')
      sql += ` ON CONFLICT ("${meta.conflictKey}") DO UPDATE SET ${updates}`
    } else {
      sql += ` ON CONFLICT ("${meta.conflictKey}") DO NOTHING`
    }
    return sql
  }
}

const copyTable = async (my, pg, table, { mode, since }) => {
  const meta = await describeTable(pg, table)
  const sqlFor = insertSql(meta, mode)

  // updated_at이 없는 테이블(whale_alerts, persons_images)은 델타에서도 전체를 훑는다.
  // 각각 8만 행과 18행이라 부담이 없다.
  const useSince = mode === 'delta' && meta.hasUpdatedAt
  const where = useSince ? ' WHERE updated_at >= ?' : ''
  const params = useSince ? [since] : []
  const cols = meta.columns.map(c => `\`${c}\``).join(', ')

  let copied = 0
  let offset = 0

  for (;;) {
    const [rows] = await my.query(
      `SELECT ${cols} FROM \`${table}\`${where} ORDER BY ${meta.conflictKey ? `\`${meta.conflictKey}\`` : cols.split(', ')[0]} LIMIT ? OFFSET ?`,
      [...params, BATCH, offset],
    )
    if (rows.length === 0) break

    const flat = rows.flatMap(row => buildRow(row, meta))
    await pg.query(sqlFor(rows.length), flat)

    copied += rows.length
    offset += rows.length
    process.stdout.write(`\r  ${table}: ${copied}`)
  }

  process.stdout.write(`\r  ${table}: ${copied}\n`)
  return copied
}

// identity 컬럼의 시퀀스를 MAX(id)에 맞춘다. 빠뜨리면 앱 기동 직후 첫 INSERT부터
// PK 충돌이 난다.
const resetSequences = async (pg) => {
  for (const table of TABLES) {
    const meta = await describeTable(pg, table)
    if (!meta.hasIdentity) continue

    await pg.query(
      `SELECT setval(
         pg_get_serial_sequence($1, 'id'),
         COALESCE((SELECT MAX(id) FROM "${table}"), 1),
         (SELECT MAX(id) IS NOT NULL FROM "${table}")
       )`,
      [table],
    )
    console.log(`  ${table}: 시퀀스 재설정`)
  }
}

const main = async () => {
  const mode = arg('mode') || 'full'
  const since = arg('since')

  if (!['full', 'delta'].includes(mode)) throw new Error('--mode는 full 또는 delta')
  if (mode === 'delta' && !since) throw new Error('--mode=delta에는 --since=<ISO8601>이 필요하다')
  if (!process.env.MYSQL_URL || !process.env.PG_URL) throw new Error('MYSQL_URL, PG_URL 환경변수가 필요하다')

  const my = await mysql.createConnection({
    uri: process.env.MYSQL_URL,
    // 드라이버가 시각을 해석하지 못하게 막는다. 문자열 그대로 받아 직접 UTC로 표시한다.
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  })
  const pg = new Client({ connectionString: process.env.PG_URL })
  await pg.connect()
  await pg.query("SET timezone = 'UTC'")

  console.log(`모드: ${mode}${since ? ` (since ${since})` : ''}`)
  try {
    for (const table of TABLES) await copyTable(my, pg, table, { mode, since })
    console.log('시퀀스 재설정:')
    await resetSequences(pg)
    console.log('완료')
  } finally {
    await pg.end()
    await my.end()
  }
}

main().catch(e => {
  console.error('\n실패:', e.message)
  process.exit(1)
})
```

- [ ] **Step 4: `tools/migrate/verify.mjs` 작성**

```js
import mysql from 'mysql2/promise'
import pkg from 'pg'
import { TABLES, describeTable } from './schema.mjs'

const { Client } = pkg

const main = async () => {
  const my = await mysql.createConnection({ uri: process.env.MYSQL_URL, dateStrings: true })
  const pg = new Client({ connectionString: process.env.PG_URL })
  await pg.connect()
  await pg.query("SET timezone = 'UTC'")

  let failed = 0

  for (const table of TABLES) {
    const meta = await describeTable(pg, table)
    const key = meta.conflictKey

    // 행 수
    const [[myCount]] = await my.query(`SELECT COUNT(*) AS n FROM \`${table}\``)
    const { rows: [pgCount] } = await pg.query(`SELECT COUNT(*) AS n FROM "${table}"`)
    const same = String(myCount.n) === String(pgCount.n)
    if (!same) failed++
    console.log(`${same ? 'OK  ' : 'FAIL'} ${table}: mysql=${myCount.n} pg=${pgCount.n}`)

    // 경계값. 타임존이 밀렸는지 여기서 드러난다.
    if (meta.hasUpdatedAt) {
      const [[myB]] = await my.query(
        `SELECT MIN(${key}) AS lo, MAX(${key}) AS hi, MAX(updated_at) AS mx FROM \`${table}\``)
      const { rows: [pgB] } = await pg.query(
        `SELECT MIN(${key}) AS lo, MAX(${key}) AS hi,
                to_char(MAX(updated_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS mx
           FROM "${table}"`)
      const myMax = myB.mx ? String(myB.mx).slice(0, 19).replace('T', ' ') : null
      const ok = String(myB.lo) === String(pgB.lo)
        && String(myB.hi) === String(pgB.hi)
        && myMax === pgB.mx
      if (!ok) failed++
      console.log(`${ok ? 'OK  ' : 'FAIL'}   경계: mysql=${myB.lo}..${myB.hi}/${myMax} pg=${pgB.lo}..${pgB.hi}/${pgB.mx}`)
    }
  }

  // boolean 변환
  const [[myActive]] = await my.query('SELECT COUNT(*) AS n FROM notifications WHERE active = 1')
  const { rows: [pgActive] } = await pg.query('SELECT COUNT(*) AS n FROM notifications WHERE active = true')
  const activeOk = String(myActive.n) === String(pgActive.n)
  if (!activeOk) failed++
  console.log(`${activeOk ? 'OK  ' : 'FAIL'} notifications.active: mysql=${myActive.n} pg=${pgActive.n}`)

  // numeric 정밀도
  const [[myAmt]] = await my.query('SELECT SUM(amount_usd) AS s FROM whale_alerts')
  const { rows: [pgAmt] } = await pg.query('SELECT SUM(amount_usd) AS s FROM whale_alerts')
  const amtOk = String(myAmt.s) === String(pgAmt.s)
  if (!amtOk) failed++
  console.log(`${amtOk ? 'OK  ' : 'FAIL'} whale_alerts.amount_usd 합계: mysql=${myAmt.s} pg=${pgAmt.s}`)

  await pg.end()
  await my.end()

  console.log(failed === 0 ? '\n전부 일치' : `\n불일치 ${failed}건`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(e => {
  console.error('실패:', e.message)
  process.exit(1)
})
```

- [ ] **Step 5: `tools/migrate/README.md` 작성**

```markdown
# 이관 도구

MySQL에서 PostgreSQL로 옮기는 일회성 운영 스크립트다. 두 DB가 같은 EC2 인스턴스에
있으므로 **서버 위에서** 돌린다 — 230MB가 인터넷을 왕복하지 않고 자격증명도 로컬
네트워크를 벗어나지 않는다.

## 준비

```bash
scp -r -i <pem> tools/migrate ubuntu@webserver.coinsect.io:~/migrate
ssh -i <pem> ubuntu@webserver.coinsect.io
cd ~/migrate && npm install

export MYSQL_URL='mysql://root:<pw>@127.0.0.1:3306/coinsect'
export PG_URL='postgres://coinsect:<pw>@127.0.0.1:5432/coinsect'
```

## 전체 이관

```bash
node copy.mjs --mode=full
node verify.mjs
```

## 델타 동기화

`--since`는 전체 이관을 **시작한** 시각이다(끝난 시각이 아니다 — 이관 도중 들어온
변경을 놓치지 않기 위해서다). UTC ISO8601로 넘긴다.

```bash
node copy.mjs --mode=delta --since='2026-08-19T12:00:00Z'
node verify.mjs
```

## 동작

- `updated_at`이 있는 테이블은 `WHERE updated_at >= :since`로 읽어
  `ON CONFLICT (id) DO UPDATE`. INSERT와 UPDATE(소프트삭제 포함)가 한 번에 처리된다.
- `updated_at`이 없는 테이블(`whale_alerts`, `persons_images`)은 전체를 다시 훑어
  `ON CONFLICT DO NOTHING`.
- 매 실행 끝에 identity 시퀀스를 `MAX(id)`에 맞춘다.

**한계:** 하드 삭제된 행은 델타로 잡히지 않는다. 이 코드베이스는 사용자 콘텐츠를 전부
소프트삭제로 처리하므로 실질 영향이 없다.
```

- [ ] **Step 6: 커밋**

```bash
git add tools/migrate/
git commit -m "feat: MySQL에서 PostgreSQL로 옮기는 이관 도구를 추가한다

테이블 목록만 고정하고 컬럼 구성은 PostgreSQL에서 읽어 쓴다. MySQL을
dateStrings로 읽어 시각 문자열에 직접 Z를 붙이므로 드라이버의 타임존 해석에
의존하지 않는다.

델타는 updated_at 유무로 전략을 나눈다. 있으면 그 기준으로 upsert하고, 없으면
(whale_alerts, persons_images) 전체를 다시 훑어 충돌을 무시한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: 리허설

서비스는 계속 MySQL로 돌아간다. 실패해도 영향이 없다.

**Files:** 없음 (운영 작업)

- [ ] **Step 1: PostgreSQL 롤과 DB 생성**

```bash
ssh -i <pem> ubuntu@webserver.coinsect.io
sudo -u postgres psql -c "CREATE ROLE coinsect LOGIN PASSWORD '<pw>'"
sudo -u postgres psql -c "CREATE DATABASE coinsect OWNER coinsect"
```

- [ ] **Step 2: 기준선 적용**

```bash
psql -h 127.0.0.1 -U coinsect -d coinsect -v ON_ERROR_STOP=1 -f ~/migrate/001_baseline.sql
```
Expected: 에러 없음

- [ ] **Step 3: 이관 시작 시각을 기록해 두고 전체 이관**

```bash
date -u +'%Y-%m-%dT%H:%M:%SZ' | tee ~/migrate/started_at.txt
cd ~/migrate && time node copy.mjs --mode=full
```
Expected: 20개 테이블 전부 완료, `messages_202605`가 852,544행

- [ ] **Step 4: 검증**

Run: `node verify.mjs`
Expected: `전부 일치`, 종료 코드 0

불일치가 나오면 원인을 잡고 PostgreSQL DB를 지운 뒤(`DROP DATABASE coinsect`) Step 1부터 다시 한다.

- [ ] **Step 5: 앱을 리허설 DB에 붙여 확인**

로컬에서 `ormconfig.ts`를 리허설 DB로 맞추고 `npm run dev`로 띄운 뒤 주요 경로를 확인한다.

- `GET /posts?limit=5` — 목록, 조인, 반응 집계
- `GET /posts/:sharingKey` — 상세, 조회수 증가
- `GET /posts?query==비트코인` — ILIKE 검색
- `GET /whale_alerts?where=amountUsd:gte:3000000&limit=5` — 새 DSL
- `GET /whale_alerts?where=1=1` — **400으로 막혀야 한다**
- `GET /notifications` — boolean 컬럼
- `GET /dashboards/activities?start=2026-01-01` — 원시 SQL 집계
- 채팅 접속 → 메시지 전송 → 반응 토글

시각이 밀리지 않았는지 특히 본다. 게시글 목록의 `createdAt`을 MySQL 쪽 값과 직접 비교한다.

- [ ] **Step 6: 결과 기록**

리허설에서 걸린 시간과 발견한 문제를 `docs/superpowers/plans/`에 메모로 남긴다. 컷오버 때 필요한 정보다.

---

## Task 11: 컷오버

**Files:** 없음 (운영 작업)

- [ ] **Step 1: 최신 코드가 main에 있는지 확인**

Run: `git status --short --branch && git log --oneline -8`
Expected: 작업 트리 깨끗, Task 1~9의 커밋이 전부 올라가 있음

- [ ] **Step 2: API 정지**

```bash
ssh -i <pem> ubuntu@webserver.coinsect.io
pm2 stop coinsect_api   # 또는 현재 프로세스 관리 방식에 맞게
```

실제 기동 방식은 `.github/workflows/deploy.yml`의 마지막 SSH 블록을 먼저 읽어 확인한다.

- [ ] **Step 3: 델타 동기화**

`--since`는 **리허설 전체 이관을 시작한 시각**이다(`~/migrate/started_at.txt`).

```bash
cd ~/migrate
node copy.mjs --mode=delta --since="$(cat started_at.txt)"
node verify.mjs
```
Expected: `전부 일치`

- [ ] **Step 4: 시크릿 교체**

`EC2_ORMCONFIG`를 PostgreSQL용 `ormconfig.ts` 내용으로 바꾼다.

```bash
gh secret set EC2_ORMCONFIG --repo kispi/coinsect_api < ormconfig.ts
```

- [ ] **Step 5: 배포**

```bash
gh workflow run "Deploy to EC2" --repo kispi/coinsect_api
gh run watch --repo kispi/coinsect_api
```
Expected: 성공. "Verify ormconfig.ts survived shell expansion" 단계도 통과해야 한다

- [ ] **Step 6: smoke test**

Task 10 Step 5의 목록을 운영 도메인 상대로 다시 돈다. 특히 쓰기 경로를 본다 — 시퀀스가 제대로 잡혔는지는 첫 INSERT에서 드러난다.

- 게시글 작성 → 댓글 작성 → 반응 토글
- 채팅 메시지 전송
- 로그인

- [ ] **Step 7: 크론 확인**

`whale_alerts` 크롤링이 `ON CONFLICT DO NOTHING`으로 잘 도는지 로그를 본다. 다음 주기까지 기다린다.

- [ ] **문제 발생 시 롤백**

`EC2_ORMCONFIG`를 MySQL 내용으로 되돌리고 재배포한다. MySQL은 손대지 않은 채 살아 있다. 단, 컷오버 이후 PostgreSQL에 들어간 데이터는 되돌아가지 않으므로 판단은 빠를수록 좋다.

---

## Task 12: 정리

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 안정화 확인**

최소 하루는 지켜본다. 에러 로그, 응답 시간, 크론 동작.

- [ ] **Step 2: MySQL 중지**

```bash
ssh -i <pem> ubuntu@webserver.coinsect.io
sudo systemctl stop mysql
sudo systemctl disable mysql
free -m
```

바로 삭제하지 않는다. 최종 덤프를 보관한 뒤에 지운다.

```bash
mysqldump -uroot -p<pw> coinsect | gzip > ~/coinsect_mysql_final_$(date +%Y%m%d).sql.gz
```

(중지 전에 뜨거나, 중지 후 잠깐 다시 올려서 뜬다.)

- [ ] **Step 3: README 갱신**

`README.md`에서 MySQL을 언급하는 부분을 PostgreSQL로 고치고, 스키마 관리가
`schema/001_baseline.sql`로 바뀌었음을 적는다.

Run: `grep -n -i "mysql\|migration" README.md`

- [ ] **Step 4: 커밋**

```bash
git add README.md
git commit -m "docs: DB가 PostgreSQL로 바뀐 것을 README에 반영한다

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**스펙 커버리지**

| 스펙 항목 | 담당 태스크 |
|---|---|
| 산출물 구조 | Task 7 (schema), Task 9 (tools/migrate), Task 7 (migrations 삭제) |
| 타입 매핑 | Task 7 |
| 타임존 (`timestamptz`, `dateStrings`) | Task 7, Task 8 Step 3, Task 9 Step 3 |
| `updated_at` 트리거 | Task 7 |
| 인덱스/제약조건 정리 | Task 7 |
| 데이터 이관, 델타 전략, `setval` | Task 9 |
| 드라이버 전환 | Task 8 |
| `?where=` DSL | Task 2, Task 3 |
| 보간 지점 15곳 | Task 4 (3), Task 5 (9), Task 6 (3) |
| 컷오버 5단계 | Task 10, 11, 12 |
| 검증 항목 | Task 9 (verify.mjs), Task 10 Step 5, Task 11 Step 6 |

**리스크 대응 커버리지:** 타임존 → Task 7/9 + verify의 경계값 대조. 시퀀스 → Task 9 `resetSequences` + Task 11 Step 6. `?where=` 문법 변경으로 인한 프론트 영향 → Task 3 Step 4에서 내부 호출부를 훑고, Task 10 Step 5에서 실제 확인. 메모리 → `BATCH = 1000`. 하드 삭제 → README에 명시.

**알려진 미결:** 프론트엔드(`coinsect_frontend`/`coinsect_nuxt`)가 `?where=`를 쓰고 있다면 그쪽도 새 문법으로 고쳐야 한다. 이 저장소 밖이라 계획에 포함하지 않았고, Task 10 Step 5에서 실제 요청을 보며 확인한다. 쓰는 곳이 나오면 별도 작업으로 뺀다.
