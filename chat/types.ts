import { SocketStream } from '@fastify/websocket'

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