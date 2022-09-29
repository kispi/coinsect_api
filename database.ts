import 'reflect-metadata'
import { DataSource } from 'typeorm'
const options = require('./ormconfig')

export const dataSource = new DataSource(options)