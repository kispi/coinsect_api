import { Entity, Column, OneToOne, JoinColumn } from 'typeorm'
import { User } from './user'
import BaseModel from './base_model'

export enum TypeProvider {
  TypeKakao = 'kakao',
  TypeNaver = 'naver',
  TypeGoogle = 'google',
  TypeFacebook = 'facebook',
}

@Entity({ name: 'auth_tokens' })
export class AuthToken extends BaseModel {
  @JoinColumn()
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  user: User

  @Column()
  token: string

  @Column()
  provider: TypeProvider
}