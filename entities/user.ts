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

  // deactivatedAt이 "비활성화된 시각"이므로, 값이 있으면 비활성이고 없어야 활성이다.
  // 반대로 적혀 있었다.
  activated() {
    return !this.deactivatedAt
  }

  async activate() {
    // delete로 프로퍼티를 지우면 TypeORM이 그 컬럼을 UPDATE문에서 통째로 빼버려
    // DB의 값이 그대로 남는다. 실제로 활성화가 되지 않았다. NULL을 명시해야 지워진다.
    this.deactivatedAt = null
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