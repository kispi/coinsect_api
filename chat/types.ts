import { SocketStream } from 'fastify-websocket'

export interface IUser {
  profile?: {
    nickname: string,
    image: string,
  },
  token: string,
}

export interface IMessage {
  type: 'auth' | 'text' | 'connections' | 'ping',
  user: IUser,
  text?: string,
  numConnections: number,
  ts: Date,
}

export interface IConnection {
  connection: SocketStream,
  user: IUser,
  ip: string,
}