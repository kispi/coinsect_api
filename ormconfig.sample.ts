const { SnakeNamingStrategy } = require('typeorm-naming-strategies')

const p = process.env.NODE_ENV === 'production'

const entitiesDir = p ? 'dist/entities' : 'entities'
const subscribersDir = p ? 'dist/subscribers' : 'subscribers'

export default {
  host: 'localhost',
  port: 5432,
  username: '',
  password: '',
  database: '',
  logging: false,
  entities: [`${entitiesDir}/**/*{.js,.ts}`],
  subscribers: [`${subscribersDir}/**/*{.js,.ts}`,],
  // 시각 컬럼은 전부 timestamptz다. 세션 타임존을 UTC로 못 박아 서버 로케일에
  // 관계없이 같은 값을 읽게 한다.
  extra: { options: '-c timezone=UTC' },
  namingStrategy: new SnakeNamingStrategy(),
}
