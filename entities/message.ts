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

  @Column({ nullable: true, type: 'text' })
  meta: string

  @Column()
  numConnections: number
}