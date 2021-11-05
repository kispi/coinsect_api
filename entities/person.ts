import { Entity, Column, ManyToMany, JoinTable, Index } from 'typeorm'
import { Image } from './image'
import BaseModel from './base_model'

@Entity({ name: 'persons' })
export class Person extends BaseModel {
  @Column()
  name: string

  @Column({ nullable: true, type: 'text' })
  bio: string

  @ManyToMany(() => Image)
  @JoinTable({ name: 'persons_images' })
  images: Image[]

  @Column({ nullable: true, type: 'text' })
  description: string

  @Column()
  @Index()
  sharingKey: string
}