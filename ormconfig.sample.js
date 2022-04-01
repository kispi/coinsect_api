const { SnakeNamingStrategy } = require('typeorm-naming-strategies');

const p = process.env.NODE_ENV === 'production'

const entitiesDir = p ? 'dist/entities' : 'entities'
const migrationsDir = p ? 'dist/migrations' : 'migrations'
const subscribersDir = p ? 'dist/subscribers' : 'subscribers'

module.exports = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: '',
  password: '',
  database: '',
  logging: false,
  entities: [`${entitiesDir}/**/*{.js,.ts}`],
  migrations: [`${migrationsDir}/**/*{.js,.ts}`],
  subscribers: [`${subscribersDir}/**/*{.js,.ts}`,],
  cli: {
    entitiesDir,
    migrationsDir,
    subscribersDir,
  },
  timezone: 'Z',
  namingStrategy: new SnakeNamingStrategy(),
}