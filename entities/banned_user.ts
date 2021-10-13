import { Entity, Column, JoinColumn, OneToOne, CreateDateColumn } from 'typeorm'
import { User } from './user'
import BaseModel from './base_model'

@Entity({ name: 'banned_users' })
export class BannedUser extends BaseModel {
  @JoinColumn()
  @OneToOne(() => User, { onDelete: 'SET NULL' })
  user: User

  @Column({ nullable: true })
  ip: string

  @Column({ type: 'text', nullable: true })
  reason: string

  @CreateDateColumn({ nullable: true })
  until: Date
}