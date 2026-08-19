# 이관 도구

MySQL에서 PostgreSQL로 옮기는 일회성 운영 스크립트다. 두 DB가 같은 EC2 인스턴스에
있으므로 **서버 위에서** 돌린다 — 230MB가 인터넷을 왕복하지 않고 자격증명도 로컬
네트워크를 벗어나지 않는다.

## 준비

```bash
scp -r -i <pem> tools/migrate ubuntu@webserver.coinsect.io:~/migrate
ssh -i <pem> ubuntu@webserver.coinsect.io
cd ~/migrate && npm install

export MYSQL_URL='mysql://root:<pw>@127.0.0.1:3306/coinsect'
export PG_URL='postgres://coinsect:<pw>@127.0.0.1:5432/coinsect'
```

## 전체 이관

```bash
node copy.mjs --mode=full
node verify.mjs
```

## 델타 동기화

`--since`는 전체 이관을 **시작한** 시각이다(끝난 시각이 아니다 — 이관 도중 들어온
변경을 놓치지 않기 위해서다). UTC ISO8601로 넘긴다.

```bash
node copy.mjs --mode=delta --since='2026-08-19T12:00:00Z'
node verify.mjs
```

## 동작

- 테이블 목록(`schema.mjs`의 `TABLES`)은 FK 의존 순서로 고정돼 있지만, 컬럼 구성과
  기본키는 매 실행마다 PostgreSQL의 `information_schema`에서 읽는다. 스키마가
  바뀌어도 이 도구를 고칠 필요가 없다.
- `updated_at`이 있는 테이블은 `WHERE updated_at >= :since`로 읽어
  `ON CONFLICT (id) DO UPDATE`. INSERT와 UPDATE(소프트삭제 포함)가 한 번에 처리된다.
- `updated_at`이 없는 테이블(`whale_alerts`는 `hash` 단일키, `persons_images`는
  `(persons_id, images_id)` 복합키)은 전체를 다시 훑어 `ON CONFLICT ... DO NOTHING`.
- MySQL은 `dateStrings: true`로 읽는다. 드라이버가 시각을 파싱하지 못하게 막고
  문자열 그대로 받아 끝에 `Z`를 붙여 UTC로 못 박는다 — 어느 쪽 드라이버의 타임존
  해석에도 의존하지 않는다.
- `schema/001_baseline.sql`의 `set_updated_at` 트리거는 `ON CONFLICT DO UPDATE`에도
  BEFORE UPDATE로 걸려서, 우리가 넣은 MySQL 원본 `updated_at`을 이관 실행 시각으로
  덮어써 버린다. 델타 upsert가 도는 동안만 대상 테이블의 사용자 트리거를 꺼서
  원본 시각을 보존한다(`ALTER TABLE ... DISABLE/ENABLE TRIGGER USER` — FK 제약은
  내부 트리거라 영향받지 않는다).
- 매 실행 끝에 identity 시퀀스를 `MAX(id)`에 맞춘다.

**한계:** 하드 삭제된 행은 델타로 잡히지 않는다. 이 코드베이스는 사용자 콘텐츠를 전부
소프트삭제로 처리하므로 실질 영향이 없다.

**권한:** `PG_URL`의 유저는 대상 테이블에 대해 `ALTER TABLE ... DISABLE/ENABLE
TRIGGER`를 실행할 수 있어야 한다(테이블 소유자면 충분하다).
