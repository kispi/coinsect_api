import { test } from 'node:test'
import assert from 'node:assert/strict'
import { joinIfAbsent } from '../core/orm'

// SelectQueryBuilder를 흉내내는 가짜. expressionMap.aliases에 이미 별칭이 있는지와
// leftJoinAndSelect 호출 여부/횟수만 있으면 가드를 검증하기에 충분하다.
const fakeQb = (existingAliasNames: string[] = []) => {
  const calls: Array<{ target: string, alias: string }> = []
  return {
    calls,
    expressionMap: {
      aliases: existingAliasNames.map(name => ({ name })),
    },
    leftJoinAndSelect(target: string, alias: string) {
      calls.push({ target, alias })
      this.expressionMap.aliases.push({ name: alias })
      return this
    },
  }
}

test('joinIfAbsent: 별칭이 없으면 조인한다', () => {
  const qb = fakeQb(['User'])
  joinIfAbsent(qb as any, 'User.profile', 'profile')
  assert.equal(qb.calls.length, 1)
  assert.deepEqual(qb.calls[0], { target: 'User.profile', alias: 'profile' })
})

// 어드민이 profile.nickname으로 검색하려면 ?join=User.profile을 보내야 하고, 그러면
// querySetter가 이미 'profile'을 붙인 뒤 컨트롤러가 또 붙이려 든다. 이 중복이 그대로
// 나가면 쿼리가 실행에서 죽는다.
test('joinIfAbsent: ?join=User.profile로 이미 붙었으면 다시 조인하지 않는다', () => {
  const qb = fakeQb(['User', 'profile'])
  joinIfAbsent(qb as any, 'User.profile', 'profile')
  assert.equal(qb.calls.length, 0, '이미 조인된 별칭을 다시 조인하면 안 된다')
})

test('joinIfAbsent: 다른 별칭은 방해하지 않는다', () => {
  const qb = fakeQb(['User', 'someOtherJoin'])
  joinIfAbsent(qb as any, 'User.profile', 'profile')
  assert.equal(qb.calls.length, 1)
  assert.deepEqual(qb.calls[0], { target: 'User.profile', alias: 'profile' })
})

test('joinIfAbsent: 두 번 불러도 한 번만 조인한다', () => {
  const qb = fakeQb(['User'])
  joinIfAbsent(qb as any, 'User.profile', 'profile')
  joinIfAbsent(qb as any, 'User.profile', 'profile')
  assert.equal(qb.calls.length, 1)
})

test('joinIfAbsent: 항상 같은 쿼리빌더를 반환한다', () => {
  const qb = fakeQb([])
  assert.equal(joinIfAbsent(qb as any, 'User.profile', 'profile'), qb)
})
