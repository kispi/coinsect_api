import { Entity, Column, OneToOne, JoinColumn, OneToMany, ManyToOne, getRepository } from 'typeorm'
import { Board } from './board'
import { Reaction } from './reaction'
import { Reply } from './reply'
import { User } from './user'
import IContext from '../core/context'
import helpers from '../core/helpers'
import store from '../store'
import BaseModel from './base_model'

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

  increaseViews(c: IContext) {
    const views = store.state.lastUserActions.viewPost[c.req.ip] || {}
    if (views[this.id]) return

    views[this.id] = helpers.dayjs().add(store.state.globalVariables.lastUserActionTimeouts.viewPost, 'milliseconds')
    store.state.lastUserActions.viewPost[c.req.ip] = views
    setTimeout(
      () => delete store.state.lastUserActions.viewPost[c.req.ip][this.id],
      store.state.globalVariables.lastUserActionTimeouts.viewPost,
    )

    this.views += 1
    getRepository(Post).save(this)
  }

  toJSON() {
    delete this.password
    return this
  }
}