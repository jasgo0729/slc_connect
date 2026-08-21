import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * 커넥션 풀
 *
 * 개발 중에는 파일이 바뀔 때마다 모듈이 다시 평가되므로,
 * globalThis에 붙여 두지 않으면 풀이 계속 새로 생기고
 * Postgres 커넥션이 금방 고갈된다.
 */

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
