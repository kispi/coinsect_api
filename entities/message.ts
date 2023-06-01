import { Entity, Column, ManyToOne, OneToMany } from 'typeorm'
import { Reaction, simplifiedReaction } from './reaction'
import { User } from './user'
import { dataSource } from '../database'
import BaseModel from './base_model'

export const populateReactions = async (messages: Array<Message>) => {
  const messageIds = messages.map(message => message.id)
  const reactions = await dataSource.getRepository(Reaction).createQueryBuilder().where(`message_id IN (${messageIds.join(',')})`).getMany()
  const reactionsMap = {}
  reactions.forEach(reaction => {
    if (!reactionsMap[reaction.messageId]) reactionsMap[reaction.messageId] = [reaction]
    else reactionsMap[reaction.messageId].push(reaction)
  })
  messages.forEach(message => {
    message.reactions = (reactionsMap[message.id] || []).map(simplifiedReaction)
    message.user = User.sensitiveAuthInfoFilteredUser(message.user) as any
  })
}

@Entity({ name: 'messages' })
export class Message extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.message)
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