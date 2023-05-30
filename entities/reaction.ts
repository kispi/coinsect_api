import { Entity, Column, ManyToOne } from 'typeorm'
import { Message } from './message'
import { Post } from './post'
import { Reply } from './reply'
import { User } from './user'
import BaseModel from './base_model'

@Entity({ name: 'reactions' })
export class Reaction extends BaseModel {
  @Column({ nullable: true })
  postId: number

  @ManyToOne(() => Post, post => post.reactions, { onDelete: 'SET NULL' })
  post: Post

  @Column({ nullable: true })
  replyId: number

  @ManyToOne(() => Reply, reply => reply.reactions, { onDelete: 'SET NULL' })
  reply: Reply

  @Column({ nullable: true })
  messageId: number

  @ManyToOne(() => Message, message => message.reactions, { onDelete: 'SET NULL' })
  message: Message

  @Column()
  type: String

  @Column({ nullable: true })
  userId: number

  @ManyToOne(() => User, { onDelete: 'SET NULL', createForeignKeyConstraints: false })
  user: User

  @Column({ nullable: true })
  nickname: string

  @Column()
  ip: string
}