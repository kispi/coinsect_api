import { dataSource } from '../database'
import { Message } from '../entities/message'
import { Profile } from '../entities/profile'
import { User } from '../entities/user'
import { IConnection, IMessage } from './types'
import { ManipulateType } from 'dayjs'
import { log } from '../core/logger'
import store from './store'
import coreHelpers from '../core/helpers'

const dayjs = coreHelpers.dayjs

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

const updateProfile = async ({ jwt, nickname, image }: { jwt: string, nickname: string, image: string }) => {
  const user = await User.findWithJWT(jwt)
  if (!user) return

  if (user.profile.nickname !== nickname) {
    try {
      const existing = await dataSource.getRepository(Profile).findOne({ where: { nickname } })
      if (existing) return Promise.reject({ message: 'EXISTING_NICKNAME' })

      user.profile.nickname = nickname
    } catch (e) {}
  }

  if (user.profile.image !== image) user.profile.image = image

  await dataSource.getRepository(Profile).save(user.profile)
}

// 로그인 된 유저는 jwt, 비로그인 유저는 token을 통해 profile을 가져온다.
const populateUserProfile = async message => {
  if (!message.user) return

  const user = store.getters.user(message.user.token)
  message.user.profile = user.profile

  if (!message.user.jwt) return

  try {
    const found = await User.findWithJWT(message.user.jwt)
    message.user.profile.nickname = found.profile.nickname
    message.user.profile.image = found.profile.image
    delete message.user.jwt
  } catch (e) {
    log.error('sendMessage:', e)
  }

  // 유저의 jwt는 서버가 클라이언트들에게 알려서는 안됨
  delete message.user.jwt
}

const asIMessage = (message): IMessage => {
  const s = store.getters.stats()

  const dbStoredUser = {
    token: message.token,
    profile: {
      nickname: message.nickname,
      image: message.image,
    },
    id: message.userId,
  }

  const iMessage = {
    id: message.id,
    type: message.type,
    user: message.user || dbStoredUser,
    text: message.text,
    meta: message.meta,
    numConnections: s.numConnections,
    stats: {
      numConnections: s.numConnections,
      numBulls: s.numBulls,
      numBears: s.numBears,
    },
    ts: message.ts || new Date(),
  }

  if (message.token) iMessage.user.token = message.token
  return iMessage
}

const saveMessage = async ({
  message,
  ip,
  softDelete,
} : {
  message,
  ip: string,
  softDelete?: Boolean, // softDelete된 상태로 insert하여 채팅창에 노출되지 않도록 함.
}) => {
  if (['text', 'image'].indexOf(message.type) < 0) return

  if (!message.user || !message.user.token) return

  const iMessage = asIMessage(message)
  const row = {
    ip,
    ts: iMessage.ts,
    numConnections: iMessage.numConnections,
    type: iMessage.type,
    text: coreHelpers.allNewlineTrimmed(iMessage.text),
  }

  if (softDelete) row['deletedAt'] = dayjs().format()
  else {
    store.getters.recentMessages().unshift(iMessage)
    store.actions.updateRecentMessages()
  }

  // 클라에서 stringify 해서 날아오긴 할건데, 아닐 경우 방어.
  if (iMessage.meta) row['meta'] = typeof iMessage.meta !== 'string' ? JSON.stringify(iMessage.meta) : iMessage.meta

  const user = store.getters.user(message.user.token)
  if (user) {
    row['nickname'] = user.profile.nickname
    row['image'] = user.profile.image
    row['token'] = user.token
  }
  try {
    if (message.user.jwt) row['user'] = { id: (await coreHelpers.jwt.decode(message.user.jwt))['id'] }
    const insert = await dataSource.createQueryBuilder().insert().into(Message).values([row]).execute()
    if (!softDelete) store.actions.loadRecentMessages()
    return insert.generatedMaps[0]
  } catch (e) {
    return Promise.reject(e)
  }
}

// token은 받는 사람의 토큰이고, message.user.token은 보낸 사람의 토큰이다.
const sendMessage = ({ message, token, ip }: { message, token?: string, ip?: string }) => {
  const targetConnections = store.getters.targetConnections({ ip, token })

  const finalMessage = asIMessage(message)
  if (finalMessage.text) finalMessage.text = coreHelpers.allNewlineTrimmed(finalMessage.text)

  targetConnections.forEach(connectionWrapper => connectionWrapper.connection.socket.send(JSON.stringify(finalMessage)))
}

// 메시지를 접속된 클라이언트들에게 뿌리고 서버 메모리에 저장한다. (나중에 redis pubsub으로 변경)
const broadcast = async message => {
  await populateUserProfile(message)

  // 동일 유저가 n >= 2개 이상의 커넥션을 만든 경우 (새 탭 등) sendMessage를 한 번만 하기 위해 해시로 필터링한다.
  // (그냥 connections.forEach(conn => sendMessage...) 하게 되면 같은 계정 n개 탭에서 접속한 경우 걔들은 메시지 n번씩 찍힘)
  const o = {}
  store.getters.connections().forEach(conn => o[conn.user.token] = conn)
  Object.values(o).forEach((conn: IConnection) => sendMessage({ message, token: conn.user.token }))
}

const alertUser = ({
  text,
  token,
  ip,
}: {
  text: string,
  token?: string,
  ip?: string,
}) => sendMessage({
  message: { type: 'alert', text },
  token,
  ip,
})

// 디폴트는 한국시각 기준
const formatWithAdd = ({
  date,
  format = 'YYYY-MM-DD HH:mm:ss',
  unit = 'hours',
  number = 9,
}: {
  date,
  format?: string,
  unit?: ManipulateType,
  number?: number,
}) => {
  const p = date
  return dayjs(p).add(number, unit).format(format)
}

export default {
  dayjs,
  saveMessage,
  sendMessage,
  alertUser,
  broadcast,
  asIMessage,
  updateProfile,
  formatWithAdd,
  mustToken,
}