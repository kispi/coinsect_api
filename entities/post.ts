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

const summarizeNumReactions = (writing: Post | Reply, requestIP: string) => {
  // reactions이 없더라도, 클라이언트 null check를 위해 summary 객체는 생성
  if (!writing['summary']) writing['summary'] = { reactions: { thumbs_up: {}, thumbs_down: {} } }

  if ((writing.reactions || []).length === 0) return

  // [Post | Reply].reactions 삭제 (추천한 사람들 ip 노출 방지)
  writing['summary'].reactions = { thumbs_up: { count: 0 }, thumbs_down: { count: 0 } }
  writing.reactions.forEach(reaction => {
    if (reaction.type === 'thumbs_up') {
      writing['summary'].reactions['thumbs_up'].count++
      writing['summary'].reactions['thumbs_up'].activated = reaction.ip === requestIP
    }
    if (reaction.type === 'thumbs_down') {
      writing['summary'].reactions['thumbs_down'].count++
      writing['summary'].reactions['thumbs_down'].activated = reaction.ip === requestIP
    }
  })
  delete writing.reactions
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
    const requiredFields = ['title', 'content', 'nickname']
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

  static async save(post: Post) {
    delete post.views // Post.views는 저장하지 않는다.
    try {
      return await dataSource.getRepository(Post).save(post)
    } catch (e) {
      return Promise.reject(e)
    }
  }

  mutatePostToBeSecure(ip: string) {
    this.user = User.sensitiveAuthInfoFilteredUser(this.user) as any
    const numReplies = (this.replies || []).filter(reply => !reply.deletedAt).length
  
    if ((this.replies || []).length > 0) this.replies.forEach(reply => summarizeNumReactions(reply, ip))
    this.replies = helpers.organizeReplies(this.replies)
    summarizeNumReactions(this, ip)
    if (this['summary']) this['summary'].numReplies = numReplies
    else this['summary'] = { numReplies }
  }

  toJSON() {
    delete this.password
    delete this.ip
    return this
  }
}