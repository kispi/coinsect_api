import { Entity, Column, JoinColumn, OneToOne } from 'typeorm'
import { User } from './user'
import { Image } from './image'
import BaseModel from './base_model'

enum TypeProfileGender {
  TypeProfileGenderMale = 'male',
  TypeProfileGenderFemale = 'female',
}

@Entity({ name: 'profiles' })
export class Profile extends BaseModel {
  @JoinColumn()
  @OneToOne(() => User, user => user.profile, { onDelete: 'SET NULL' })
  user: User

  @Column({ nullable: true })
  TypeProfileGender: TypeProfileGender

  @Column({ nullable: true })
  birthday: Date

  @Column({ nullable: true })
  name: string

  @Column()
  nickname: string

  @JoinColumn()
  @OneToOne(() => Image, { onDelete: 'SET NULL' })
  image: Image
}