import { Entity, Column } from 'typeorm'
import BaseModel from './base_model'

@Entity({ name: 'messages' })
export class Message extends BaseModel {
  @Column({ type: 'text' })
  json: string

  @Column()
  ip: string
}