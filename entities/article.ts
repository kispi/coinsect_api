import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm'
import BaseModel from './base_model'
import { Reaction } from './reaction'
import { Reply } from './reply'
import { User } from './user'

@Entity({ name: 'articles' })
export class Article extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.article)
  reactions: Array<Reaction>

  @OneToMany(() => Reply, reply => reply.article)
  replies: Array<Reply>

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column()
  views: number

  @JoinColumn()
  @OneToOne(() => User)
  user: User

  @Column()
  nickname: string

  @Column()
  ip: string
}