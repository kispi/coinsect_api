import { test } from 'node:test'
import assert from 'node:assert/strict'
import { joinBlockchainIfNeeded } from '../controllers/wallet_controller'

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

test('joinBlockchainIfNeeded: blockchain 별칭이 없으면 조인한다', () => {
  const qb = fakeQb([])
  joinBlockchainIfNeeded(qb as any)
  assert.equal(qb.calls.length, 1)
  assert.deepEqual(qb.calls[0], { target: 'Wallet.blockchain', alias: 'blockchain' })
})

test('joinBlockchainIfNeeded: ?join=Wallet.blockchain으로 이미 붙었으면 다시 조인하지 않는다', () => {
  // querySetter의 ?join= 루프가 이미 'blockchain' 별칭으로 조인해 둔 상태를 흉내낸다.
  const qb = fakeQb(['Wallet', 'blockchain'])
  joinBlockchainIfNeeded(qb as any)
  assert.equal(qb.calls.length, 0, '이미 조인된 별칭을 다시 조인하면 안 된다')
})

test('joinBlockchainIfNeeded: 다른 별칭은 방해하지 않는다', () => {
  const qb = fakeQb(['Wallet', 'someOtherJoin'])
  joinBlockchainIfNeeded(qb as any)
  assert.equal(qb.calls.length, 1)
  assert.deepEqual(qb.calls[0], { target: 'Wallet.blockchain', alias: 'blockchain' })
})

test('joinBlockchainIfNeeded: 항상 같은 쿼리빌더를 반환한다', () => {
  const qb = fakeQb([])
  const returned = joinBlockchainIfNeeded(qb as any)
  assert.equal(returned, qb)
})
