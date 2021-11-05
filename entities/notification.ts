import { Entity, Column } from 'typeorm'
import BaseModel from './base_model'

@Entity({ name: 'notifications' })
export class Notification extends BaseModel {
  @Column()
  text: string

  @Column()
  type: string

  @Column({ nullable: true })
  link: string

  @Column({ default: false })
  active: boolean
}