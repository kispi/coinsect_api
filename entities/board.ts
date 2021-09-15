import { Entity, Column, OneToMany } from 'typeorm'
import { Post } from './post'
import BaseModel from './base_model'

@Entity({ name: 'boards' })
export class Board extends BaseModel {
  @OneToMany(() => Post, post => post.board)
  posts: Post[]

  @Column({ nullable: true })
  type: string

  @Column({ nullable: true })
  title: string

  @Column({ nullable: true })
  description: string
}