import { Entity, Column, OneToMany } from 'typeorm'
import BaseModel from './base_model'
import { Wallet } from './wallet'

@Entity({ name: 'blockchains' })
export class Blockchain extends BaseModel {
  @Column()
  name: string

  @Column()
  symbol: string

  @Column()
  icon: string

  @Column({ nullable: true })
  exploreUrl: string

  @Column({ nullable: true })
  description: string

  @OneToMany(() => Wallet, wallet => wallet.blockchain)
  wallets: Wallet[]
}