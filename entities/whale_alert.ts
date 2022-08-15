import { Entity, Column } from 'typeorm'

@Entity({ name: 'whale_alerts' })
export class WhaleAlert {
  @Column({ unique: true, primary: true })
  hash: string

  @Column({ nullable: true, type: 'decimal', precision: 36, scale: 18 })
  amount: number

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  amountUsd: number

  @Column({ nullable: true })
  fromAddress: string

  @Column({ nullable: true })
  blockchain: string

  @Column({ nullable: true })
  symbol: string

  @Column({ nullable: true })
  fromOwner: string

  @Column({ nullable: true })
  fromOwnerType: string

  @Column({ nullable: true })
  toAddress: string

  @Column({ nullable: true })
  toOwner: string

  @Column({ nullable: true })
  toOwnerType: string

  @Column({ nullable: true })
  transactionCount: number

  @Column({ nullable: true })
  transactionType: string

  @Column({ nullable: true })
  timestamp: number
}