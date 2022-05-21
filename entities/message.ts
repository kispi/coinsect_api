import { Entity, Column } from 'typeorm'
import BaseModel from './base_model'

@Entity({ name: 'messages' })
export class Message extends BaseModel {
  @Column()
  ip: string

  @Column()
  type: string

  @Column()
  text: string

  @Column()
  nickname: string

  @Column({ nullable: true })
  image: string
  
  @Column()
  token: string

  @Column()
  ts: Date

  @Column({ nullable:true, type: 'text' })
  meta: string

  @Column()
  numConnections: number

  static asIMessage(o: Message) {
    return {
      id: o.id,
      type: o.type,
      text: o.text,
      ts: o.ts,
      numConnections: o.numConnections,
      user: {
        token: o.token,
        profile: {
          nickname: o.nickname,
          image: o.image,
        },
      },
    }
  }
}