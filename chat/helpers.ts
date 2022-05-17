const nicknameRecommendations = [
  '가즈아', '흑우', '블랙카우', '손절장인', '익항올', '이말올', '이럴거면왜올림', '이럴거면왜내림', '대폰지', '결국폰지사기',
  '오늘도물타기', '물린뒤전망조사', '강제장투', '야미털기', '건전한조정', '코린이', '버거타임', '세력', '타노스빔', '우지한의', '떡락충', '침팬치',
  '메로나', '장대양봉', '스크류바', '장대음봉', '투더문', '기도매매', '우상향', '존버의신', '행복회로불탐', '리또속', '워뇨띠꿈나무', '했제충',
  '무지성롱', '어제청산당함', '청산당할예정', '데드캣', '단타의신', '그새팔았음', '뚝100불남음', '다시는안칠게요', '귀하의포지션이', '방금음전',
  '올해10만불',
]

const mustToken = existingTokens => {
  const o = {}
  if (existingTokens) existingTokens.forEach(t => o[t] = true)

  let nonExistNewToken = ''
  for (let i = 0; i < 100; i++) {
    let token = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    if (o[token]) continue

    nonExistNewToken = token
    break
  }

  return nonExistNewToken
}

const mustJSON = {
  stringify: o => {
    let result = null
    try {
      result = JSON.stringify(o)
    } catch (e) {}
    return result
  },
  parse: o => {
    let result = null
    try {
      result = JSON.parse(o)
    } catch (e) {}
    return result
  }
}

const recommendNickname = () => {
  const randIdx = Math.floor(Math.random() * nicknameRecommendations.length)
  const randNo = Math.floor(Math.random() * 100 + 1)
  return `${nicknameRecommendations[randIdx]}${randNo}`
}

const asIMessage = (message, connections) => {
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

export default {
  mustJSON,
  asIMessage,
  recommendNickname,
  mustToken,
}