import { Entity, Column, OneToOne } from 'typeorm'
import { Profile } from './profile'
import { dataSource } from '../database'
import helpers from '../core/helpers'
import BaseModel from './base_model'

export enum TypeUserRole {
  TypeAdmin = 'admin',
  TypeUser = 'user',
}

export enum TypeUserAuth {
  TypeSuper = 'super',
  TypeManager = 'manager',
  TypePosition = 'position',
}

@Entity({ name: 'users' })
export class User extends BaseModel {
  @Column({ length: 255 })
  email: string

  @Column({ nullable: true })
  password: string

  @Column({ nullable: true })
  phone: string

  @Column({ default: TypeUserRole.TypeUser })
  role: TypeUserRole

  @Column({ nullable: true })
  auth: TypeUserAuth

  @Column({ default: 0 })
  signInCount: number

  @Column({ nullable: true })
  lastSignIn: Date

  @Column({ nullable: true })
  lastSignInIp: string

  @Column({ nullable: true })
  deactivatedAt: Date

  @OneToOne(() => Profile, profile => profile.user)
  profile: Profile

  activated() {
    return this.deactivatedAt ? true : false
  }

  async activate() {
    delete this.deactivatedAt
    await dataSource.getRepository(User).save(this)
  }

  async deactivate() {
    this.deactivatedAt = new Date()
    await dataSource.getRepository(User).save(this)
  }

  static async findWithJWT(jwt: string) {
    const decoded = await helpers.jwt.decode(jwt)
    return await dataSource.getRepository(User).findOne({ where: { id: decoded['id'] }, relations: ['profile'] })
  }

  // 채팅창에 보여질 정보를 제외한 모든 DB의 항목은 제외해준다.
  static sensitiveAuthInfoFilteredUser(user) {
    if (!(user || {}).profile) return

    const newUser = {
      id: user.id,
      profile: {
        image: user.profile.image,
        nickname: user.profile.nickname,
      },
    }

    return newUser
  }

  static jwt(user) {
    if (!user) return

    return helpers.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      auth: user.auth,
    })
  }
}