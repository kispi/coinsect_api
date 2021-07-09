const { SnakeNamingStrategy } = require("typeorm-naming-strategies");

module.exports = {
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "",
  "database": "coinsect",
  "logging": false,
  "entities": [
     "entities/**/*.ts"
  ],
  "migrations": [
     "migrations/**/*.ts"
  ],
  "subscribers": [
     "subscribers/**/*.ts"
  ],
  "cli": {
     "entitiesDir": "entities",
     "migrationsDir": "migrations",
     "subscribersDir": "subscribers"
  },
  "namingStrategy": new SnakeNamingStrategy(),
}