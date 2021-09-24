import { Entity, Column } from 'typeorm'
import BaseModel from './base_model'

@Entity({ name: 'images' })
export class Image extends BaseModel {
  @Column()
  key: string

  @Column({ nullable: true })
  type: string

  @Column({ nullable: true })
  description: string
}