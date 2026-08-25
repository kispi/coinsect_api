import axios from 'axios'
import store from '../store'
import { log } from '../core/logger'

const KAPI = 'https://kapi.kakao.com'

// 카카오 로그인은 클라이언트가 보내온 kakaoId/email을 절대 믿지 않는다. 액세스 토큰을
// 카카오에 되물어서 받아낸 값만 신원으로 취급한다.
export type KakaoIdentity = {
  kakaoId: string,
  email: string,
}

export type AccessTokenInfo = {
  id: number,
  expires_in: number,
  app_id: number,
}

export type KakaoMe = {
  id: number,
  kakao_account?: {
    email?: string,
    email_needs_agreement?: boolean,
    is_email_valid?: boolean,
    is_email_verified?: boolean,
  },
}

// 카카오 응답만으로 신원을 확정하는 순수 판정부. I/O가 없어서 그대로 테스트한다.
export const identityOf = (
  tokenInfo: AccessTokenInfo,
  me: KakaoMe,
  appId: number,
): KakaoIdentity => {
  // 앱 ID가 없으면 남의 카카오 앱 토큰을 걸러낼 수단이 없다. 열어두지 않고 막는다.
  if (!appId) throw { message: 'ERR_KAKAO_NOT_CONFIGURED', status: 500 }

  // 응답을 못 받았으면 여기서 끊는다. 없으면 아래에서 TypeError가 나 원인이 가려진다.
  if (!tokenInfo || !me) throw { message: 'ERR_KAKAO_TOKEN_INVALID', status: 401 }

  // 다른 카카오 앱에서 발급받은 토큰은 우리 앱의 사용자 ID 공간과 무관하다. 공격자가
  // 자기 앱을 만들어 받은 정상 토큰으로 우리 계정에 올라타는 걸 막는 핵심 검사다.
  if (tokenInfo.app_id !== appId) throw { message: 'ERR_KAKAO_TOKEN_INVALID', status: 401 }

  if (!tokenInfo.id || !me.id || tokenInfo.id !== me.id) throw { message: 'ERR_KAKAO_TOKEN_INVALID', status: 401 }

  const account = me.kakao_account || {}
  // 이메일이 계정의 유일한 식별 키라 미동의/미인증 이메일은 받지 않는다. example.com
  // 같은 임의 도메인이 들어오던 경로가 여기서 닫힌다.
  if (!account.email || account.email_needs_agreement) throw { message: 'ERR_KAKAO_EMAIL_REQUIRED', status: 403 }
  if (account.is_email_valid === false || account.is_email_verified === false) {
    throw { message: 'ERR_KAKAO_EMAIL_UNVERIFIED', status: 403 }
  }

  return { kakaoId: String(me.id), email: account.email }
}

// server_modules.ts의 전역 인터셉터가 res => res.data로 이미 벗겨서 준다. 여기서
// 다시 .data를 꺼내면 undefined가 된다(실제로 그렇게 깨졌다). 응답 본문이 그대로 온다.
export type KakaoFetcher = (path: string, accessToken: string) => Promise<unknown>

const fetchKakao: KakaoFetcher = async (path, accessToken) =>
  await axios.get(`${KAPI}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 5000,
  })

// 액세스 토큰의 진위와 발급 앱까지 카카오에 확인한 뒤, 카카오가 알려준 사용자 ID와
// 인증된 이메일만 돌려준다.
const verifyAccessToken = async (
  accessToken: string,
  fetcher: KakaoFetcher = fetchKakao,
): Promise<KakaoIdentity> => {
  const appId = Number(store.state.serverConfig?.KAKAO_APP_ID)
  if (!appId) {
    log.error('kakao.verifyAccessToken: .env KAKAO_APP_ID is missing')
    return Promise.reject({ message: 'ERR_KAKAO_NOT_CONFIGURED', status: 500 })
  }

  let tokenInfo: AccessTokenInfo
  let me: KakaoMe
  try {
    tokenInfo = await fetcher('/v1/user/access_token_info', accessToken) as AccessTokenInfo
    me = await fetcher('/v2/user/me', accessToken) as KakaoMe
  } catch (e) {
    // 인터셉터의 에러 쪽은 err.response를 그대로 throw한다. 즉 e가 곧 응답이라 e.data에
    // 카카오의 에러 본문이 들어 있다(-401이면 토큰이 위조됐거나 만료된 것이다).
    log.error('kakao.verifyAccessToken:', e?.data || e?.message || e)
    return Promise.reject({ message: 'ERR_KAKAO_TOKEN_INVALID', status: 401 })
  }

  try {
    return identityOf(tokenInfo, me, appId)
  } catch (e) {
    return Promise.reject(e)
  }
}

export default {
  verifyAccessToken,
}
