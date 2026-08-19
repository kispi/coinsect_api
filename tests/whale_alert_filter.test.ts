import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyExcludeBetweenSameExchange } from '../services/onchain/whale_alert'

const fakeQb = () => {
  const calls: Array<{ sql: string, params?: object }> = []
  return { calls, andWhere(sql: string, params?: object) { calls.push({ sql, params }); return this } }
}

test('excludeBetweenSameExchange: XOR을 불리언 <>로 옮기고 값은 파라미터로 넘긴다', () => {
  const qb = fakeQb()
  applyExcludeBetweenSameExchange(qb as any)

  assert.equal(qb.calls.length, 1)
  assert.match(qb.calls[0].sql, /<>/)
  assert.doesNotMatch(qb.calls[0].sql, /XOR/i, 'XOR은 PostgreSQL에 없다')
  assert.doesNotMatch(qb.calls[0].sql, /'unknown'/, '값은 SQL에 박히면 안 된다')
  assert.deepEqual(qb.calls[0].params, { unknown: 'unknown' })
})
