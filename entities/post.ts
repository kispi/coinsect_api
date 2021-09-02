import { Entity, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm'
import BaseModel from './base_model'
import { Board } from './board'
import { Reaction } from './reaction'
import { User } from './user'

enum PostType {
  Normal = 'normal',
  Reply = 'reply',
}

@Entity({ name: 'posts' })
export class Post extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.post)
  reactions: Array<Reaction>

  @ManyToOne(() => Board, board => board.posts)
  board: Board

  @ManyToOne(() => Post, post => post.children)
  parent: Post

  @OneToMany(() => Post, post => post.parent)
  children: Array<Post>

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column({ default: PostType.Normal })
  postType: PostType

  @Column({ default: 0 })
  views: number

  @JoinColumn()
  @OneToOne(() => User)
  user: User

  @Column()
  nickname: string

  @Column({ nullable: true })
  ip: string
}