import { Entity, Column } from 'typeorm'
import BaseModel from './base_model'

@Entity({ name: 'bad_words' })
export class BadWord extends BaseModel {
  @Column({ default: 'insulting' })
  type: string

  @Column()
  word: string

  @Column({ nullable: true })
  alternative: string
}