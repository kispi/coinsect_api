import { Entity, Column, OneToMany, ManyToOne, Index } from 'typeorm'
import { Board } from './board'
import { Reaction } from './reaction'
import { Reply } from './reply'
import { User } from './user'
import { dataSource } from '../database'
import IContext from '../core/interfaces/context'
import helpers from '../core/helpers'
import store from '../store'
import BaseModel from './base_model'

enum TypePostType {
  Normal = 'normal',
}

@Entity({ name: 'posts' })
export class Post extends BaseModel {
  @OneToMany(() => Reaction, reaction => reaction.post)
  reactions: Reaction[]

  @OneToMany(() => Reply, reply => reply.post)
  replies: Reply[]

  @ManyToOne(() => Board, board => board.posts, { onDelete: 'SET NULL' })
  board: Board

  @Column({ nullable: true })
  boardId: number

  @Column({ length: 255, nullable: true })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column({ default: TypePostType.Normal })
  postType: TypePostType

  @Column({ default: 0 })
  views: number

  @ManyToOne(() => User, { onDelete: 'SET NULL', createForeignKeyConstraints: false })
  user: User

  @Column({ nullable: true })
  userId: number

  @Column()
  nickname: string

  @Column({ nullable: true })
  ip: string

  @Column({ nullable: true })
  @Index()
  sharingKey: string

  @Column({ nullable: true })
  password: string

  async increaseViews(c: IContext) {
    const views = store.state.lastUserActions.viewPost[c.req.ip] || {}
    if (views[this.id]) return

    views[this.id] = helpers.dayjs().add(store.state.globalVariables.lastUserActionTimeouts.viewPost, 'milliseconds')
    store.state.lastUserActions.viewPost[c.req.ip] = views
    setTimeout(
      () => delete store.state.lastUserActions.viewPost[c.req.ip][this.id],
      store.state.globalVariables.lastUserActionTimeouts.viewPost,
    )

    this.views += 1
    try {
      await dataSource.getRepository(Post).update({ sharingKey: this.sharingKey }, { views: this.views })
    } catch (e) {}
    return this
  }

  static async validate(post) {
    const requiredFields = ['title', 'content', 'nickname', 'password']
    if (!helpers.trimAndValidateRequiredFields(post, requiredFields)) {
      return Promise.reject()
    }

    if (post.title.length > store.state.globalVariables.maxlength.postTitle) {
      return Promise.reject({ message: 'TITLE_TOO_LONG' })
    }
    if (post.nickname.length > store.state.globalVariables.maxlength.nickname) {
      return Promise.reject({ message: 'NICKNAME_TOO_LONG' })
    }
  }

  static async checkPassword(sharingKey: string, password: string) {
    if (!password) Promise.reject({ message: 'INCORRECT_PASSWORD' })

    try {
      const target = await dataSource.getRepository(Post).findOneOrFail({ where: { sharingKey }})
      if (!helpers.compare(target.password, password)) {
        return Promise.reject({ message: 'INCORRECT_PASSWORD' })
      }
      return Promise.resolve()
    } catch (e) {
      return Promise.reject({ message: 'NOT_FOUND' })
    }
  }

  async save() {
    delete this.views // Post.views는 저장하지 않는다.
    try {
      return await dataSource.getRepository(Post).save(this)
    } catch (e) {
      return Promise.reject(e)
    }
  }

  toJSON() {
    delete this.password
    delete this.ip
    return this
  }
}