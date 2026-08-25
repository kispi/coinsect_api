import { test } from 'node:test'
import assert from 'node:assert/strict'
import { identityOf, AccessTokenInfo, KakaoMe } from '../services/kakao'

const APP_ID = 1234567

const tokenInfo = (overrides: Partial<AccessTokenInfo> = {}): AccessTokenInfo => ({
  id: 3300112233,
  expires_in: 21599,
  app_id: APP_ID,
  ...overrides,
})

const me = (account: KakaoMe['kakao_account'] = {}, overrides: Partial<KakaoMe> = {}): KakaoMe => ({
  id: 3300112233,
  kakao_account: {
    email: 'real@kakao.com',
    is_email_valid: true,
    is_email_verified: true,
    ...account,
  },
  ...overrides,
})

const rejects = (fn: () => unknown, message: string, status: number) => {
  assert.throws(fn, (e: { message: string, status: number }) => {
    assert.equal(e.message, message)
    assert.equal(e.status, status)
    return true
  })
}

test('정상 토큰이면 카카오가 준 id/email을 신원으로 준다', () => {
  assert.deepEqual(identityOf(tokenInfo(), me(), APP_ID), {
    kakaoId: '3300112233',
    email: 'real@kakao.com',
  })
})

test('앱 ID 설정이 없으면 통과시키지 않고 막는다', () => {
  rejects(() => identityOf(tokenInfo(), me(), 0), 'ERR_KAKAO_NOT_CONFIGURED', 500)
  rejects(() => identityOf(tokenInfo(), me(), NaN), 'ERR_KAKAO_NOT_CONFIGURED', 500)
})

test('남의 카카오 앱에서 발급된 토큰은 거절한다', () => {
  rejects(() => identityOf(tokenInfo({ app_id: 7654321 }), me(), APP_ID), 'ERR_KAKAO_TOKEN_INVALID', 401)
})

test('토큰의 주인과 조회된 사용자가 다르면 거절한다', () => {
  rejects(() => identityOf(tokenInfo({ id: 1 }), me(), APP_ID), 'ERR_KAKAO_TOKEN_INVALID', 401)
})

test('이메일이 없거나 동의하지 않았으면 가입시키지 않는다', () => {
  rejects(() => identityOf(tokenInfo(), me({ email: undefined }), APP_ID), 'ERR_KAKAO_EMAIL_REQUIRED', 403)
  rejects(
    () => identityOf(tokenInfo(), me({ email_needs_agreement: true }), APP_ID),
    'ERR_KAKAO_EMAIL_REQUIRED',
    403,
  )
})

test('카카오가 인증하지 않은 이메일은 거절한다', () => {
  rejects(() => identityOf(tokenInfo(), me({ is_email_verified: false }), APP_ID), 'ERR_KAKAO_EMAIL_UNVERIFIED', 403)
  rejects(() => identityOf(tokenInfo(), me({ is_email_valid: false }), APP_ID), 'ERR_KAKAO_EMAIL_UNVERIFIED', 403)
})

// 이번 사고의 재현: 클라이언트가 email/kakaoId를 지어내도 신원은 카카오 응답에서만 나온다.
test('클라이언트가 뭘 보내든 신원은 카카오 응답에서만 나온다', () => {
  const identity = identityOf(tokenInfo(), me(), APP_ID)
  assert.notEqual(identity.email, 'xss_test@example.com')
  assert.equal(identity.email, 'real@kakao.com')
})

// --- verifyAccessToken: 카카오 응답이 실제로 도착하는 "형태"를 못 박는다 ---
//
// 이 구간이 비어 있어서 프로덕션이 깨졌다. identityOf만 테스트하면 잘 만든 객체를
// 직접 넣어주므로, axios가 무엇을 돌려주는지 틀려도 전부 통과한다. 실제로는
// server_modules.ts의 전역 인터셉터가 res => res.data로 이미 본문을 벗겨서 주는데
// 서비스가 .data를 한 번 더 꺼내 undefined가 됐고, 진짜 토큰일 때만 터졌다
// (가짜 토큰은 axios가 throw해 catch로 빠지므로 스모크 테스트도 통과했다).
import kakao from '../services/kakao'
import store from '../store'

store.state.serverConfig = { ...(store.state.serverConfig || {}), KAKAO_APP_ID: String(APP_ID) }

// 인터셉터를 통과한 뒤의 모습 = 카카오 응답 본문 그 자체.
const fakeFetcher = (bodies: Record<string, unknown>) =>
  async (path: string) => bodies[path]

const KAKAO_BODIES = {
  '/v1/user/access_token_info': { id: 3300112233, expires_in: 21599, app_id: APP_ID },
  '/v2/user/me': {
    id: 3300112233,
    kakao_account: { email: 'real@kakao.com', is_email_valid: true, is_email_verified: true },
  },
}

test('verifyAccessToken: 인터셉터가 벗겨준 응답 본문을 그대로 읽는다', async () => {
  const identity = await kakao.verifyAccessToken('valid-token', fakeFetcher(KAKAO_BODIES))
  assert.deepEqual(identity, { kakaoId: '3300112233', email: 'real@kakao.com' })
})

test('verifyAccessToken: 응답이 비면 TypeError가 아니라 우리 에러로 떨어진다', async () => {
  await assert.rejects(
    () => kakao.verifyAccessToken('t', fakeFetcher({})),
    (e: { message: string, status: number }) => {
      assert.equal(e.message, 'ERR_KAKAO_TOKEN_INVALID')
      assert.equal(e.status, 401)
      return true
    },
  )
})

test('verifyAccessToken: 카카오가 토큰을 거절하면 401로 옮긴다', async () => {
  await assert.rejects(
    // 인터셉터의 에러 쪽은 err.response를 그대로 throw한다.
    () => kakao.verifyAccessToken('t', async () => Promise.reject({ status: 401, data: { code: -401 } })),
    (e: { message: string }) => {
      assert.equal(e.message, 'ERR_KAKAO_TOKEN_INVALID')
      return true
    },
  )
})

test('verifyAccessToken: 남의 앱 토큰은 진짜 응답이어도 거절한다', async () => {
  await assert.rejects(
    () => kakao.verifyAccessToken('t', fakeFetcher({
      ...KAKAO_BODIES,
      '/v1/user/access_token_info': { id: 3300112233, expires_in: 21599, app_id: 999999 },
    })),
    (e: { message: string }) => {
      assert.equal(e.message, 'ERR_KAKAO_TOKEN_INVALID')
      return true
    },
  )
})
