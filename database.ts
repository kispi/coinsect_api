import 'reflect-metadata'
import { DataSource } from 'typeorm'
import options from './ormconfig'

export const dataSource = new DataSource({
  type: 'mysql',
  ...options,
  // 유지보수가 끊긴 mysql 대신 mysql2를 사용한다. TypeORM은 기본값이 'mysql'이라 명시가 필요함.
  connectorPackage: 'mysql2',
})