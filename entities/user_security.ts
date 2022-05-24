import { Entity, Column, OneToOne, JoinColumn } from 'typeorm'
import { User } from './user'
import BaseModel from './base_model'

@Entity({ name: 'user_securities' })
export class UserSecurity extends BaseModel {
  @JoinColumn()
  @OneToOne(() => User, { onDelete: 'SET NULL' })
  user: User

  @Column({ nullable: true })
  passwordResetToken: string

  @Column({ nullable: true })
  passwordResetTokenSentAt: Date
}