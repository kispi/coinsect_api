import { Entity, Column, ManyToOne } from 'typeorm'
import { Blockchain } from './blockchain'
import BaseModel from './base_model'

@Entity({ name: 'wallets' })
export class Wallet extends BaseModel {
  @ManyToOne(() => Blockchain, blockchain => blockchain.wallets, { onDelete: 'SET NULL' })
  blockchain: Blockchain

  @Column()
  address: string

  @Column({ nullable: true })
  memo: string // 리플은 데스티네이션 태그

  @Column({ nullable: true })
  description: string
}