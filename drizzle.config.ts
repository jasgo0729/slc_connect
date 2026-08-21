import type { Config } from 'drizzle-kit';

import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // 마이그레이션 파일을 반드시 커밋할 것.
  // 로컬과 서버가 어긋나는 사고는 대부분 여기서 시작한다.
  verbose: true,
  strict: true,
} satisfies Config;
