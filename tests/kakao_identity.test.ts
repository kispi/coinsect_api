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
