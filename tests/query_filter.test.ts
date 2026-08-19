import { test } from 'node:test'
import assert from 'node:assert/strict'

test('러너가 TypeScript 테스트를 실행한다', () => {
  const x: number = 1
  assert.equal(x, 1)
})
