import { Entity, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm'
import BaseModel from './base_model'
import { Board } from './board'
import { Reaction } from './reaction'
import { Reply } from './reply'
import { User } from './user'

enum PostType {
  Normal = 'normal',
}

@Entity({ name: 'posts' })
export class Post extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.post)
  reactions: Array<Reaction>

  @OneToMany(() => Reply, reply => reply.post)
  replies: Array<Reply>

  @ManyToOne(() => Board, board => board.posts, { onDelete: 'SET NULL' })
  board: Board

  @Column({ length: 255, nullable: true })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column({ default: PostType.Normal })
  postType: PostType

  @Column({ default: 0 })
  views: number

  @JoinColumn()
  @OneToOne(() => User, { onDelete: 'SET NULL' })
  user: User

  @Column()
  nickname: string

  @Column({ nullable: true })
  ip: string

  @Column({ nullable: true })
  sharingKey: string

  @Column({ nullable: true })
  password: string
}