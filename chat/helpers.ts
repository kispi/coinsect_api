import { getConnection } from 'typeorm'
import { Message } from '../entities/message'
import { IConnection, IMessage } from './types'
import store from './store'
const dayjs = require('dayjs')

const nicknameRecommendations = [
  '가즈아', '흑우', '블랙카우', '손절장인', '익항옳', '이말올', '이럴거면왜올림', '이럴거면왜내림', '대폰지', '결국폰지사기',
  '오늘도물타기', '물린뒤전망조사', '강제장투', '야미털기', '건전한조정', '코린이', '버거타임', '세력', '타노스빔', '우지한의', '떡락충', '침팬치',
  '메로나', '장대양봉', '스크류바', '장대음봉', '투더문', '기도매매', '우상향', '존버의신', '행복회로불탐', '리또속', '워뇨띠꿈나무', '했제충',
  '무지성롱', '어제청산당함', '청산당할예정', '데드캣', '단타의신', '그새팔았음', '뚝100불남음', '다시는안칠게요', '귀하의포지션이', '방금음전',
  '올해10만불', '숏스톤대가리볶음', '롱스톤대가리볶음', '비둘기대가리빨기', '이걸못봤네', '모든걸잃음', '이걸음전하네', '7주연속음봉', '천국의계단',
  '코인은사기다', '크립토트레이더', '백수', '영끌대출청산', '짧은뚝배기', '청산에살어리랏다', '노동의소중함', '자본주의의한계', '지지', '저항',
  '불황', '잃을게없는사람', '벼랑끝에몰린청년', '상방쐐기', '하방쐐기', '삼각수렴', 'BULLFLAG', 'BEARFLAG', '바닥이없네', '지하실구경', '우박사',
  '불건전한조정', '2100만개', '코인왜하냐', 'BJ파월', '대공황', '부처빔', '떡상', '떡락', '무소유빔', '4년후에봐요', '비트코인은끝났다',
]

const mustToken = () => {
  let nonExistNewToken = ''
  for (let i = 0; i < 100; i++) {
    let token = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    if (store.getters.users()[token]) continue

    nonExistNewToken = token
    break
  }

  return nonExistNewToken
}

const recommendNickname = () => {
  const randIdx = Math.floor(Math.random() * nicknameRecommendations.length)
  const randNo = Math.floor(Math.random() * 100 + 1)
  return `${nicknameRecommendations[randIdx]}${randNo}`
}

const trimmed = (text: string) => {
  if (!text) return

  return text.split('\n').map(line => line.trim()).join('\n').trim()
}

const asIMessage = (message, connections): IMessage => {
  const iMessage = {
    type: message.type,
    user: (message || {}).user,
    text: message.text,
    numConnections: connections.length - (message.type === 'leave' ? 1 : 0),
    ts: new Date(),
  }

  if (message.meta) iMessage['meta'] = message.meta
  return iMessage
}

const saveMessage = (message, ip) => {
  if (message.type !== 'text') return

  if (!message.user || !message.user.token) return

  const iMessage = asIMessage(message, store.getters.connections())
  store.getters.recentMessages().unshift(iMessage)

  // 이 줄 실행 안하면 서버가 오래떠있을 경우 최근 메시지가 무한히 늘어남
  store.actions.updateRecentMessages()

  const orm = getConnection()
  const row = {
    ip,
    ts: iMessage.ts,
    numConnections: iMessage.numConnections,
    type: iMessage.type,
    text: iMessage.text,
  }

  const user = store.getters.user(message.user.token)
  if (user) {
    row['nickname'] = user.profile.nickname
    row['image'] = user.profile.image
    row['token'] = user.token
  }

  orm.createQueryBuilder().insert().into(Message).values([row])
    .execute().then(store.actions.loadRecentMessages) // INSERT 이후 loadRecentMessages를 해줘야, 캐시에 있는 가장 최근에 삽입된 message의 id가 채워진다.
}

// token은 받는 사람의 토큰이고, message.user.token은 보낸 사람의 토큰이다.
const sendMessage = ({ message, token, ip }: { message, token?: string, ip?: string }) => {
  const targetConnections = store.getters.targetConnections({ ip, token })

  // 프로필은 클라이언트에서 준 토큰만을 가지고 찾아서 assign
  if (message.user) {
    const user = store.getters.user(message.user.token)
    message.user.profile = user.profile
  }
  const finalMessage = asIMessage(message, store.getters.connections())
  if (finalMessage.text) finalMessage.text = trimmed(finalMessage.text)

  targetConnections.forEach(connectionWrapper => connectionWrapper.connection.socket.send(JSON.stringify(finalMessage)))
}

// 메시지를 접속된 클라이언트들에게 뿌리고 서버 메모리에 저장한다. (나중에 redis pubsub으로 변경)
const broadcast = message => {
  // 동일 유저가 n >= 2개 이상의 커넥션을 만든 경우 (새 탭 등) sendMessage를 한 번만 하기 위해 해시로 필터링한다.
  // (그냥 connections.forEach(conn => sendMessage...) 하게 되면 같은 계정 n개 탭에서 접속한 경우 걔들은 메시지 n번씩 찍힘)
  const o = {}
  store.getters.connections().forEach(conn => o[conn.user.token] = conn)
  Object.values(o).forEach((conn: IConnection) => sendMessage({ message, token: conn.user.token }))
}

// 디폴트는 한국시각 기준
const formatWithAdd = ({
  date,
  format = 'YYYY-MM-DD HH:mm:ss',
  unit = 'hours',
  number = 9,
}) => {
  const p = date
  return dayjs(p).add(number, unit).format(format)
}

export default {
  saveMessage,
  sendMessage,
  trimmed,
  broadcast,
  asIMessage,
  formatWithAdd,
  recommendNickname,
  mustToken,
}