import { Entity, Column, ManyToOne } from 'typeorm'
import { User } from './user'
import BaseModel from './base_model'

@Entity({ name: 'messages' })
export class Message extends BaseModel {
  @Column()
  ip: string

  @Column()
  type: string

  @Column()
  text: string

  @Column()
  nickname: string

  @Column({ nullable: true })
  image: string
  
  @Column()
  token: string

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  user: User

  @Column({ nullable: true })
  userId: number

  @Column()
  ts: Date

  @Column({ nullable: true, type: 'text' })
  meta: string

  @Column()
  numConnections: number

  // 채팅창에 보여질 정보를 제외한 모든 DB의 항목은 제외해준다.
  filterSensitiveAuthUserInfo() {
    if (!(this.user || {}).profile) return

    const newUser = {
      id: this.user.id,
      profile: {
        image: this.user.profile.image,
        nickname: this.user.profile.nickname,
      },
    }

    this.user = newUser as any
  }
}