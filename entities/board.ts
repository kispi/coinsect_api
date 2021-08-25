import { Entity, Column, OneToMany } from 'typeorm'
import { Post } from './post'
import BaseModel from './base_model'

@Entity({ name: 'boards' })
export class Board extends BaseModel {
  @OneToMany(() => Post, post => post.board)
  posts: Array<Post>

  @Column()
  type: string

  @Column()
  title: string

  @Column()
  description: string
}