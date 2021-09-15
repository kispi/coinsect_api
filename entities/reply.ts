import { Entity, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm'
import helpers from '../core/helpers'
import store from '../store'
import BaseModel from './base_model'
import { Post } from './post'
import { Reaction } from './reaction'
import { User } from './user'

@Entity({ name: 'replies' })
export class Reply extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.post)
  reactions: Reaction[]

  // 조인없이 id만 사용할 수 있게 하려면 따로 이렇게 필드를 넣어줘야 함.
  @Column({ nullable: true })
  postId: number

  @ManyToOne(() => Post, post => post.replies, { onDelete: 'SET NULL' })
  post: Post

  @ManyToOne(() => Reply, reply => reply.replies, { onDelete: 'SET NULL' })
  parent: Post

  @OneToMany(() => Reply, reply => reply.parent)
  replies: Reply[]

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

  static async validate(reply) {
    const requiredFields = ['content', 'nickname', 'password']
    if (!helpers.trimAndValidateRequiredFields(reply, requiredFields)) {
      return Promise.reject()
    }

    if (reply.content.length > store.state.globalVariables.maxlength.replyContent) {
      return Promise.reject({ message: 'TITLE_TOO_LONG' })
    }
    if (reply.nickname.length > store.state.globalVariables.maxlength.nickname) {
      return Promise.reject({ message: 'NICKNAME_TOO_LONG' })
    }
  }

  toJSON() {
    delete this.password
    return this
  }
}