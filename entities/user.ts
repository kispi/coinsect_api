import {PrimaryGeneratedColumn, Entity, Column, Timestamp} from 'typeorm'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  birthday: string

  @Column({ length: 255 })
  name: string

  @Column({ length: 255 })
  email: string

  @Column({ name: 'created_at' })
  createdAt: Timestamp

  @Column({ name: 'updated_at' })
  updatedAt: Timestamp

  @Column({ name: 'deleted_at' })
  deletedAt: Timestamp
}