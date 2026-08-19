# PostgreSQL 마이그레이션 진행 상황

계획: [2026-08-19-postgresql-migration.md](./2026-08-19-postgresql-migration.md)
설계: [../specs/2026-08-19-postgresql-migration-design.md](../specs/2026-08-19-postgresql-migration-design.md)
브랜치: `feature/postgresql-migration`

**Task 1~9 완료. Task 10(리허설)부터 남았다.**

작업 로그(`.superpowers/sdd/`)는 gitignore라 다른 PC에는 없다. 이어받는 데 필요한 것은
전부 이 문서에 있다.

## 완료된 것

| Task | 내용 | 결과 |
|---|---|---|
| 1 | 테스트 러너 도입 (`node:test` + `tsconfig.test.json`) | 리뷰 통과 |
| 2 | `core/query_filter.ts` — `?where=` 화이트리스트 DSL 파서 | 지적 0건 |
| 3 | `querySetter` 재배선, `docs/api/query-protocol.md` 작성 | Important 1건 처리 |
| 4 | 공통 CRUD 계층 보간 제거 | 리뷰 통과 |
| 5 | 컨트롤러 7개 보간 제거 | Critical 1건 처리 |
| 6 | 서비스 계층 + 대시보드 원시 SQL | Critical 1건 처리 |
| 7 | `schema/001_baseline.sql` 작성, `migrations/` 31개 삭제 | 지적 0건 |
| 8 | 드라이버 `mysql2` → `pg` | Critical 1건 처리 |
| 9 | `tools/migrate/` 이관 도구 | Important 2건 처리 |

현재 상태: 테스트 30개 통과, `npx tsc --noEmit` 깨끗, `npm run build` 성공.
값 보간이 `core/` 밖에서 전부 사라졌다(`core/` 잔여는 식별자 보간이고 값은 파라미터).

## Task 10 시작 전 확인할 것

**pem 키 경로.** 계획서는 `C:\Users\kispi\Desktop\aws\kispi-seoul.pem`을 쓴다. 다른 PC라면
경로가 다르므로 Task 10~12의 SSH/SCP 명령을 그에 맞게 바꾼다.

**`ormconfig.ts`.** gitignore라 저장소에 없다. `ormconfig.sample.ts`를 복사해 PostgreSQL
접속정보를 채운다(값은 `ormconfig.postgre.md`에 있고 그 파일도 gitignore다). Task 8에서
이 파일을 **의도적으로 건드리지 않았다** — 운영 자격증명이 들어 있고, PostgreSQL의
`coinsect` DB는 Task 10 Step 1에서야 만들어지기 때문이다.

**PostgreSQL 쪽 상태.** `webserver.coinsect.io:5432`에 `coinsect` 롤도 DB도 아직 없다.
같은 인스턴스에 `gukto`, `calendar`, `everymaple`, `calendar_dev`가 돌고 있으니 건드리지 말 것.
Task 7 검증 때 만든 `schema_check` DB는 삭제했다.

**MySQL은 그대로 살아 있다.** 리허설은 서비스 중단 없이 돌릴 수 있다.

## 계획서에서 고친 것들

실행하면서 계획 자체의 오류를 8건 잡았다. 계획서는 이미 수정돼 있으니 **지금 버전을
그대로 따르면 된다.** 아래는 왜 그렇게 되어 있는지에 대한 기록이다.

1. **값에 든 SQL을 거부로 검증하던 테스트** — `hash:eq:x' OR '1'='1`은 field와 op가
   정상이라 거부되면 안 된다. 값은 파라미터로 나가고 그것이 방어다. 거부를 기대하면
   파서가 값까지 검열하는 방향으로 잘못 구현된다.
2. **`ParsedFilter.alias` 누락** — 조인 별칭 지원을 넣으면서 인터페이스 선언만 빠져 컴파일이
   안 됐다.
3. **Step 6b 소속 3중 불일치** — `wallet_controller` 수정이 Task 5 본문에 있는데 Files
   목록엔 없고 부록은 Task 6이라 불렀다.
4. **`wallet_controller` 이중 조인 (회귀)** — 조인 별칭을 `tb_0`에서 `blockchain`으로 바꾸면
   `querySetter`의 중복 제거가 걸릴 것이라 적었는데 틀렸다. `querySetter`는 자기 `?join=`
   루프를 다 돌린 뒤 빌더를 반환하므로 뒤에 체이닝된 컨트롤러 조인을 볼 수 없고, TypeORM은
   별칭 중복을 검사하지 않는다. 어드민이 `?join=Wallet.blockchain`을 보내면 같은 별칭이 두 번
   붙어 쿼리가 실행에서 죽는다. 컨트롤러가 직접 가드하도록 고쳤고 회귀 테스트를 넣었다.
5. **`core/orm.ts` 중복 제거 근거 주석** — 그 검사는 컨트롤러 조인이 아니라 `?join=` 안의
   중복만 걸러낸다.
6. **대시보드 `$1` 자리표시자 (회귀)** — Task 1~6은 MySQL에서 동작해야 하는데 Task 6에서
   pg 문법을 지시했다. `dataSource.query`는 자리표시자를 다시 쓰지 않고 mysql2는 `?`만
   치환하므로, `$1`이 그대로 MySQL에 도달해 `Unknown column '$1'`로 죽는다. `?`로 두고
   `$n` 전환을 Task 8로 옮겼다.
7. **ILIKE 전환에서 DSL 연산자 누락** — `core/query_filter.ts`의 `OPERATORS`가 `like`를
   `LIKE`로 만들고 있었다. `querySetter`를 쓰는 컨트롤러 10여 개가 공유하는 최대 표면이고,
   `docs/api/query-protocol.md`는 이미 `ILIKE`로 문서화돼 있었다.
8. **이관 도구의 `conflictKey`와 트리거 충돌** — 아래 "이관 도구" 절 참고.

## 이관 도구 (`tools/migrate/`)

브리프 코드에 있던 버그 두 개를 구현 중에 잡아 고쳤다.

- **`persons_images`의 복합 PK.** `conflictKey`를 `id` 유무로만 판정하고 `whale_alerts`만
  특별 처리했더니 `persons_images`(복합 PK `persons_id,images_id`)가 `null`이 되어
  `ON CONFLICT` 없이 INSERT가 나갔다. 재실행하면 PK 충돌로 죽는다. 지금은
  `information_schema`에서 실제 PK를 읽는다.
- **트리거가 델타를 오염시킴.** `schema/001_baseline.sql`이 넣은 `set_updated_at`
  BEFORE UPDATE 트리거가 `ON CONFLICT DO UPDATE`에도 발동해서, 델타로 옮긴 행의
  `updated_at`이 원본이 아니라 이관 실행 시각으로 덮어써진다. 다음 델타의 기준점이 틀어지고
  `verify.mjs`의 대조도 항상 실패한다. 델타 upsert 동안 사용자 트리거를 껐다 켠다.
  **`PG_URL` 유저에게 대상 테이블의 소유권이 필요하다**(`ALTER TABLE ... DISABLE TRIGGER`).

## Task 10에서 반드시 확인할 것

- **시각이 밀리지 않았는지.** 이 마이그레이션에서 가장 조용히 망가지는 지점이다. 게시글
  목록의 `createdAt`을 MySQL 쪽 값과 직접 비교한다. `verify.mjs`의 경계값 대조도 이걸 본다.
- **`/dashboards/activities`** — 원시 SQL이라 자동 테스트가 없다. `?start=`만, `?end=`만,
  둘 다, 둘 다 없음 — 네 조합을 직접 호출한다.
- **`?where=` DSL 거부 케이스** — `?where=1=1`이 400으로 막히는지.
- **이관 소요 시간** — `messages_202605`가 85만 행이다. 컷오버 창을 잡으려면 실측이 필요하다.
- **`verify.mjs`의 트리거 상태 검사** — 비활성 트리거가 남아 있지 않은지.

## 아직 안 한 것 (별도 작업)

**클라이언트 3개 저장소.** 새 API는 구 `?where=` 문법을 400으로 거부하므로 **API와 세
클라이언트 배포가 함께 나가야 한다**. 계획서 부록 B에 파일과 줄 단위로 정리돼 있다.

- `coinsect_nuxt` — `?where=` 4곳, `encodeURI` 제거, 고래알림 `XOR` → 전용 파라미터
- `coinsect_web` — `?where=` 1곳, `with_llm`의 `board_id`/`query` → `boardId`/`question`
- `coinsect_admin` — 데이터 테이블의 임의 SQL 입력, URL 직렬화 인코딩 없음

**후속 과제 (블로커 아님)**

- `admin_controller.ts:123`이 `wallet_controller`와 같은 체이닝 패턴이다. 어드민이
  `?join=User.profile`을 보내면 같은 이중 조인이 난다. 지금은 안 보낸다. 근본 수정은
  `core/orm.ts`에 `joinIfAbsent` 공용 헬퍼를 두는 것.
- `querySetter`의 `model` 인자가 미타입이라 반환이 `SelectQueryBuilder<ObjectLiteral>`로
  넓어지고, 그래서 헬퍼들이 `<any>`를 쓴다. 제네릭화는 별도 작업.
- `loadChildren`/`populateReactions`에 테스트 커버리지가 없다. 모든 중첩 리소스 로딩이
  거치는 지점이고 `IN (:...modelIds)`로 최근에 바뀌었다.
- MySQL `utf8mb4_0900_ai_ci`는 악센트도 무시했으나 `ILIKE`는 대소문자만 무시한다.
  한글/CJK는 무관하고 라틴 문자에서만 `cafe`/`café`가 갈린다. 필요하면 `unaccent` 검토.
- `package-lock.json`에 `mysql2`가 typeorm의 optional peer dep으로 남아 있다. 무해.
