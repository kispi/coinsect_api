import { Entity, Column, ManyToOne } from 'typeorm'
import { Post } from './post'
import { User } from './user'
import { Reply } from './reply'
import BaseModel from './base_model'

enum TypeReactionType {
  TypeReactionTypeHeart = 'heart',
  TypeReactionTypeLike = 'like',
  TypeReactionTypeDislike = 'dislike',
  TypeReactionTypeUp = 'up',
  TypeReactionTypeDown = 'down',
}

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

  @Column()
  type: TypeReactionType

  @Column({ nullable: true })
  userId: number

  @ManyToOne(() => User, { onDelete: 'SET NULL', createForeignKeyConstraints: false })
  user: User

  @Column({ nullable: true })
  nickname: string

  @Column()
  ip: string
}