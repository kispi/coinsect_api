import { Entity, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm'
import BaseModel from './base_model'
import { Post } from './post'
import { Reaction } from './reaction'
import { User } from './user'

@Entity({ name: 'replies' })
export class Reply extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.post)
  reactions: Array<Reaction>

  // 조인없이 id만 사용할 수 있게 하려면 따로 이렇게 필드를 넣어줘야 함.
  @Column({ nullable: true })
  postId: number

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

  toJSON() {
    delete this.password
    return this
  }
}