import { Entity, Column, ManyToOne } from 'typeorm'
import { User } from './user'
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

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  user: User

  @Column()
  ts: Date

  @Column({ nullable: true, type: 'text' })
  meta: string

  @Column()
  numConnections: number
}