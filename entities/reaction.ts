import { Entity, Column, JoinColumn, OneToOne, ManyToOne } from 'typeorm'
import BaseModel from './base_model'
import { Post } from './post'
import { User } from './user'

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

  @ManyToOne(() => Post, post => post.reactions, { onDelete: 'CASCADE' })
  post: Post

  @Column()
  type: TypeReactionType

  @JoinColumn()
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  user: User

  @Column({ nullable: true })
  nickname: string

  @Column()
  ip: string
}