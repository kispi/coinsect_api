import { Entity, Column, JoinColumn, OneToOne, ManyToOne } from 'typeorm'
import { Article } from './article'
import BaseModel from './base_model'
import { User } from './user'

@Entity({ name: 'reactions' })
export class Reaction extends BaseModel {
  @ManyToOne(() => Article, article => article.reactions)
  article: Article

  @Column({ length: 255 })
  title: string

  @JoinColumn()
  @OneToOne(() => User)
  user: User

  @Column()
  nickname: string

  @Column()
  ip: string
}