import { Entity, Column, JoinColumn, OneToOne, ManyToOne } from 'typeorm'
import BaseModel from './base_model'
import { Post } from './post'
import { User } from './user'

enum ReactionType {
  ReactionTypeHeart = 'reaction_type_heart'
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

  @Column()
  nickname: string

  @Column()
  ip: string
}