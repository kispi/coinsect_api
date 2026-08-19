# 스키마

`001_baseline.sql`이 스키마의 유일한 진실이다. TypeORM 마이그레이션은 2026-08-19에
폐기했다 — `migrations` 테이블(30행)과 파일(31개)이 이미 어긋나 있어 추적 가치가 없었다.

## 새 DB 만들기

```bash
sudo -u postgres psql -c "CREATE ROLE coinsect LOGIN PASSWORD '...'"
sudo -u postgres psql -c "CREATE DATABASE coinsect OWNER coinsect"
psql -h localhost -U coinsect -d coinsect -f schema/001_baseline.sql
```

## 스키마 바꾸기

`002_*.sql`, `003_*.sql`로 번호를 이어 붙인다. `001_baseline.sql`은 수정하지 않는다.
엔티티도 함께 고쳐야 한다 — TypeORM은 `synchronize: false`라 스키마를 만들지 않고
읽기만 한다.
