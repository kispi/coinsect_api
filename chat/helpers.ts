import { getConnection } from 'typeorm'
import { Message } from '../entities/message'
import { IConnection, IMessage } from './types'
import { createClient } from 'redis'
import { log } from '../core/logger'
import store from './store'
import coreHelpers from '../core/helpers'

const dayjs = coreHelpers.dayjs

const clients = {
  pub: createClient({ url: 'redis://localhost:6379' }),
  sub: createClient({ url: 'redis://localhost:6379' }),
}

const usePubsub = async () => {
  try {
    await clients.pub.connect()
    await clients.sub.connect()
    clients.sub.subscribe('coinsect_chat', stringified => {
      const json = coreHelpers.must.json(stringified)
      if (!json) {
        log.error(`helpers.usePubsub: invalid json string => ${stringified}`)
        return
      }

      if (json.psType === 'sendMessage' && json.data) {
        sendMessageInternal(json.data)
      }

      if (json.psType === 'broadcast' && json.data) {
        // 이 경우는 특정 서버의 유저가 프로필을 업데이트한 경우이므로, broadcastInternal을 실행할 필요가 없음.
        if (json.data.type === 'update') {
          store.actions.loadUsers()
          return
        }

        broadcastInternal(json.data)
      }
    })
  } catch (e) {
    log.error('helpers.usePubsub: failed to connect redis', e)
  }
}

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

const trimmed = (text: string) => {
  if (!text) return

  return text.split('\n').map(line => line.trim()).join('\n').trim()
}

const asIMessage = (message): IMessage => {
  const s = store.getters.localStats()

  const dbStoredUser = {
    token: message.token,
    profile: {
      nickname: message.nickname,
      image: message.image,
    },
  }

  const iMessage = {
    id: message.id,
    type: message.type,
    user: (message || {}).user || dbStoredUser,
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

  return iMessage
}

const saveMessage = async (message, ip) => {
  if (['text', 'image'].indexOf(message.type) < 0) return

  if (!message.user || !message.user.token) return

  // 이 줄 실행 안하면 서버가 오래떠있을 경우 최근 메시지가 무한히 늘어남
  const iMessage = asIMessage(message)
  iMessage.user = store.getters.user(message.user.token)
  const arr = await store.getters.recentMessages()
  arr.unshift(iMessage)
  store.actions.updateRecentMessages(arr)

  const orm = getConnection()
  const row = {
    ip,
    ts: iMessage.ts,
    numConnections: iMessage.numConnections,
    type: iMessage.type,
    text: trimmed(iMessage.text),
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
    const insert = await orm.createQueryBuilder().insert().into(Message).values([row]).execute()
    return insert.generatedMaps[0]
  } catch (e) {
    return Promise.reject(e)
  }
}

// token은 받는 사람의 토큰이고, message.user.token은 보낸 사람의 토큰이다.
const sendMessageInternal = ({ message, token, ip }: { message, token?: string, ip?: string }) => {
  const targetConnections = store.getters.targetConnections({ ip, token })

  // 프로필은 클라이언트에서 준 토큰만을 가지고 찾아서 assign
  if (message.user) {
    const user = store.getters.user(message.user.token)
    message.user.profile = (user || {}).profile
  }
  const finalMessage = asIMessage(message)
  if (finalMessage.text) finalMessage.text = trimmed(finalMessage.text)

  targetConnections.forEach(connectionWrapper => connectionWrapper.connection.socket.send(JSON.stringify(finalMessage)))
}

// token은 받는 사람의 토큰이고, message.user.token은 보낸 사람의 토큰이다.
const sendMessage = ({ message, token, ip }: { message, token?: string, ip?: string }) => {
  if (store.getters.config().server.USE_REDIS !== 'yes') {
    sendMessageInternal({ message, token, ip })
    return
  }

  clients.pub.publish('coinsect_chat', coreHelpers.must.string({
    psType: 'sendMessage',
    data: { message, token, ip },
  }))
}

// 메시지를 접속된 클라이언트들에게 뿌리고 서버 메모리에 저장한다. (나중에 redis pubsub으로 변경)
const broadcastInternal = message => {
  // 동일 유저가 n >= 2개 이상의 커넥션을 만든 경우 (새 탭 등) sendMessage를 한 번만 하기 위해 해시로 필터링한다.
  // (그냥 connections.forEach(conn => sendMessage...) 하게 되면 같은 계정 n개 탭에서 접속한 경우 걔들은 메시지 n번씩 찍힘)
  const o = {}
  store.getters.connections().forEach(conn => o[conn.user.token] = conn)
  Object.values(o).forEach((conn: IConnection) => sendMessage({ message, token: conn.user.token }))
}

const broadcast = message => {
  if (store.getters.config().server.USE_REDIS !== 'yes') {
    broadcastInternal(message)
    return
  }

  clients.pub.publish('coinsect_chat', coreHelpers.must.string({
    psType: 'broadcast',
    data: message,
  }))
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
  dayjs,
  usePubsub,
  saveMessage,
  sendMessage,
  trimmed,
  broadcast,
  asIMessage,
  formatWithAdd,
  mustToken,
}