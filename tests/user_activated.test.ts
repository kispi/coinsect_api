import { test } from 'node:test'
import assert from 'node:assert/strict'
import { User } from '../entities/user'

// activated()는 호출하는 곳이 없어 반전된 채로 오래 남아 있었다. 다시 뒤집히지 않도록
// 못을 박는다. DB는 건드리지 않고 순수 판정만 본다.
const userWith = (deactivatedAt: Date | null) => Object.assign(new User(), { deactivatedAt })

test('activated: deactivatedAt이 없으면 활성이다', () => {
  assert.equal(userWith(null).activated(), true)
  assert.equal(userWith(undefined).activated(), true)
})

test('activated: deactivatedAt이 있으면 비활성이다', () => {
  assert.equal(userWith(new Date('2026-08-25T00:00:00Z')).activated(), false)
})

// activate()는 delete로 프로퍼티를 지웠는데, 그러면 TypeORM이 그 컬럼을 UPDATE에서
// 빼버려 DB 값이 남는다. NULL을 명시로 넣는지 본다(save는 스텁으로 가로챈다).
test('activate: 컬럼을 UPDATE에서 빼지 않고 null을 명시한다', async () => {
  const user = userWith(new Date())
  let saved: User | null = null
  const { dataSource } = require('../database')
  const getRepository = dataSource.getRepository
  dataSource.getRepository = () => ({ save: async (u: User) => { saved = u; return u } })

  try {
    await user.activate()
  } finally {
    dataSource.getRepository = getRepository
  }

  assert.equal(user.deactivatedAt, null, 'deactivatedAt은 null이어야 한다')
  assert.ok('deactivatedAt' in user, '프로퍼티 자체가 사라지면 TypeORM이 컬럼을 갱신하지 않는다')
  assert.equal(saved, user)
  assert.equal(user.activated(), true)
})
