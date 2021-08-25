# Coinsect API

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm start
```

### Compiles and minifies for production
```
npm run prod

or

by PM2: pm2 start npm --name "coinsect_api" -- run prod
```

### Migrations
CREATE: npm run typeorm migration:generate -- -n 마이그레이션클래스명
RUN: npm run typeorm migration:run

### Conventions (꼭 읽어주세요: 수정 제안 환영합니다!)
- 테이블명은 snake_case, API RESPONSE는 camelCase
- API는 가급적 store.state에 캐시 (추후 필요시 redis 연동)