import { Entity, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm'
import BaseModel from './base_model'
import { Post } from './post'
import { Reaction } from './reaction'
import { User } from './user'

@Entity({ name: 'replies' })
export class Reply extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.post)
  reactions: Array<Reaction>

  @ManyToOne(() => Post, post => post.replies, { onDelete: 'SET NULL' })
  post: Post

  @ManyToOne(() => Reply, reply => reply.replies, { onDelete: 'SET NULL' })
  parent: Post

  @OneToMany(() => Reply, reply => reply.parent)
  replies: Array<Reply>

  @Column({ type: 'text' })
  content: string

  @JoinColumn()
  @OneToOne(() => User, { onDelete: 'SET NULL' })
  user: User

  @Column()
  nickname: string

  @Column({ nullable: true })
  ip: string

  @Column({ nullable: true })
  password: string
}