import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// drizzle-kit은 Next.js 밖에서 돌기 때문에 .env.local을 자동으로 읽지 않는다.
// 로컬에서는 이 줄이 DATABASE_URL을 채운다.
//
// 컨테이너(migrate 서비스)에는 .env.local이 없지만, 파일이 없으면
// dotenv가 조용히 넘어가고 compose의 env_file이 넣어 준 값이 그대로 쓰인다.
config({ path: '.env.local', quiet: true });

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // 생성된 마이그레이션 파일은 반드시 커밋할 것.
  // 로컬과 서버가 어긋나는 사고는 대부분 여기서 시작한다.
  verbose: true,
  strict: true,
} satisfies Config;
