import { Entity, Column, JoinColumn, OneToOne, ManyToOne } from 'typeorm'
import BaseModel from './base_model'
import { Post } from './post'
import { User } from './user'

enum ReactionType {
  ReactionTypeHeart = 'heart',
  ReactionTypeLike = 'like',
  ReactionTypeDislike = 'dislike',
  ReactionTypeUp = 'up',
  ReactionTypeDown = 'down',
}

@Entity({ name: 'reactions' })
export class Reaction extends BaseModel {
  @ManyToOne(() => Post, post => post.reactions)
  post: Post

  @Column()
  type: ReactionType

  @JoinColumn()
  @OneToOne(() => User)
  user: User

  @Column({ nullable: true })
  nickname: string

  @Column()
  ip: string
}