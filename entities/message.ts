import { Entity, Column, ManyToOne, OneToMany } from 'typeorm'
import { Reaction } from './reaction'
import { User } from './user'
import BaseModel from './base_model'

@Entity({ name: 'messages' })
export class Message extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.reply)
  reactions: Reaction[]

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

  @Column({ nullable: true })
  userId: number

  @Column()
  ts: Date

  @Column({ nullable: true, type: 'text' })
  meta: string

  @Column()
  numConnections: number
}