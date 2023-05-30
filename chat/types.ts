import { SocketStream } from '@fastify/websocket'
import { Reaction } from '../entities/reaction'

export interface IUser {
  profile?: {
    nickname: string,
    image?: string,
    sentiment?: {
      expireAt: Date | string,
      type: string,
    },
  },
  token: string,
  jwt?: string, // 로그인된 유저가 메시지를 보내는 경우 위의 token대신 jwt를 사용
  id?: number, // jwt로 유저를 찾는데 성공한 경우 이 id가 할당되어 있음.
  lastSeen?: Date | string,
  lastIP?: string,
  path?: string, // 프론트엔드에서 어떤 페이지를 이용중인지
}

export interface IUserSetting {
  token: string,
  deviceToken?: string,
  pushChatNewMessage?: Boolean,
  pushPositionChange?: Boolean,
}

export interface IMessage {
  type: 'auth' | 'text' | 'image' | 'alert' | 'users' | 'ping' | 'pong' | 'forceRefresh' | 'hideMessage' | 'enter' | 'leave' | 'update',
  user: IUser,
  text?: string,
  meta?: string | Object,
  reactions: Array<Reaction>,
  numConnections: number, // 나중에 deprecate
  stats: {
    numConnections: number,
    numBulls: number,
    numBears: number,
  },
  ts: Date,
}

export interface IConnection {
  connection: SocketStream,
  user: IUser,
  ip: string,
}