import { Entity, Column } from 'typeorm'
import BaseModel from './base_model'

@Entity()
export class User extends BaseModel {
  @Column()
  birthday: string

  @Column({ length: 255 })
  name: string

  @Column({ length: 255 })
  email: string
}