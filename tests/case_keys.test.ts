import { test } from 'node:test'
import assert from 'node:assert/strict'
import caseHelpers from '../core/helpers/case'

test('toCamel: 구분자 뒤가 숫자여도 구분자를 없앤다', () => {
  assert.equal(caseHelpers.toCamel('created_at'), 'createdAt')
  assert.equal(caseHelpers.toCamel('coin_report_download_link'), 'coinReportDownloadLink')
  assert.equal(caseHelpers.toCamel('volume_7d'), 'volume7d')
  assert.equal(caseHelpers.toCamel('cmcRank'), 'cmcRank')
  assert.equal(caseHelpers.toCamel(''), '')
})

test('keysToCamel: 중첩된 키를 전부 바꾼다', () => {
  const upbitNews = {
    success: true,
    data: {
      featured_list: [{ id: 1, created_at: '2026-08-26T15:28:06.000+09:00', is_best: true }],
      list: [{ id: 2, coin_report_logo_url: '' }],
    },
  }

  assert.deepEqual(caseHelpers.keysToCamel(upbitNews), {
    success: true,
    data: {
      featuredList: [{ id: 1, createdAt: '2026-08-26T15:28:06.000+09:00', isBest: true }],
      list: [{ id: 2, coinReportLogoUrl: '' }],
    },
  })
})

// 뉴스 content의 HTML처럼 값 쪽에도 밑줄이 흔하다. 키만 바뀌어야 한다.
test('keysToCamel: 값은 손대지 않는다', () => {
  const o = { content: '<a href="https://x.io/feed?utm_source=upbit">뉴스_원문</a>', created_at: null }

  assert.deepEqual(caseHelpers.keysToCamel(o), {
    content: '<a href="https://x.io/feed?utm_source=upbit">뉴스_원문</a>',
    createdAt: null,
  })
})

test('keysToCamel: 객체가 아닌 값과 빈 값을 그대로 돌려준다', () => {
  assert.equal(caseHelpers.keysToCamel(null), null)
  assert.equal(caseHelpers.keysToCamel(undefined), undefined)
  assert.equal(caseHelpers.keysToCamel('a_b'), 'a_b')
  assert.equal(caseHelpers.keysToCamel(3), 3)
  assert.deepEqual(caseHelpers.keysToCamel([]), [])
})

test('keysToCamel: Date는 키가 없는 객체이므로 그대로 둔다', () => {
  const date = new Date('2026-08-26T00:00:00.000Z')

  assert.equal(caseHelpers.keysToCamel({ created_at: date })['createdAt'], date)
})
