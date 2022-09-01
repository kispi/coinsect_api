import { Entity, Column, getRepository, OneToOne } from 'typeorm'
import helpers from '../core/helpers'
import BaseModel from './base_model'
import { Profile } from './profile'

export enum TypeUserRole {
  TypeAdmin = 'admin',
  TypeUser = 'user',
}

export enum TypeUserAuth {
  TypeSuper = 'super',
  TypeManager = 'manager',
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
    await getRepository(User).save(this)
  }

  async deactivate() {
    this.deactivatedAt = new Date()
    await getRepository(User).save(this)
  }

  static jwt(user) {
    return helpers.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      auth: user.auth,
    })
  }
}