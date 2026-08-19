// 이관 대상 테이블. FK 의존 순서대로 넣는다 - 부모가 먼저 들어가야 자식의 FK가 통과한다.
// migrations는 옮기지 않는다(TypeORM 추적 테이블이고 기준선에서 폐기했다).
export const TABLES = [
  'users',
  'profiles',
  'auth_tokens',
  'user_securities',
  'banned_users',
  'boards',
  'posts',
  'replies',
  'messages_202605',
  'messages',
  'reactions',
  'blockchains',
  'wallets',
  'whale_alerts',
  'images',
  'persons',
  'persons_images',
  'bad_words',
  'notifications',
  'price_predictions',
]

// PostgreSQL 쪽 컬럼 구성을 읽어 온다. 이관은 이 목록을 기준으로 한다 -
// MySQL에만 있고 PostgreSQL에 없는 컬럼은 옮기지 않는다는 뜻이다.
export const describeTable = async (pg, table) => {
  const { rows } = await pg.query(
    `SELECT column_name, data_type, is_identity
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  )
  if (rows.length === 0) throw new Error(`PostgreSQL에 ${table}이 없다`)

  const columns = rows.map(r => r.column_name)

  // 충돌 처리 키(들)를 실제 기본키 제약에서 읽는다. 대부분 id 단일 컬럼이지만
  // whale_alerts는 hash 단일 컬럼, persons_images는 (persons_id, images_id)
  // 복합키다. 하드코딩하지 않으므로 기준선 스키마가 바뀌어도 이 파일은 그대로다.
  const { rows: pkRows } = await pg.query(
    `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position`,
    [table],
  )
  const conflictKey = pkRows.length > 0 ? pkRows.map(r => r.column_name) : null

  return {
    table,
    columns,
    // 델타 판정 기준. updated_at이 없으면 전체를 다시 훑는다.
    hasUpdatedAt: columns.includes('updated_at'),
    // ON CONFLICT 대상 컬럼 목록(배열). PK가 없으면 null - 충돌 처리를 하지 않는다.
    conflictKey,
    hasIdentity: rows.some(r => r.is_identity === 'YES'),
    booleanColumns: rows.filter(r => r.data_type === 'boolean').map(r => r.column_name),
    timestampColumns: rows
      .filter(r => r.data_type === 'timestamp with time zone')
      .map(r => r.column_name),
  }
}
