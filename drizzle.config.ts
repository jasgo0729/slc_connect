import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// 로컬에서는 이 줄이 DATABASE_URL을 채운다.
// 컨테이너에는 .env가 없지만 compose의 env_file이 이미 넣어 줬고,
// dotenv는 파일이 없으면 조용히 넘어간다.
config({ path: '.env', quiet: true });

// 호스트에서는 소스가 src/ 아래에 있지만, 컨테이너에는 lib/ 와 drizzle/ 이
// /app 바로 밑에 평평하게 복사된다(Dockerfile 참고).
// 경로가 어긋나면 drizzle-kit이 "적용할 게 없다"며 조용히 끝난다.
const BASE = process.env.DRIZZLE_BASE ?? './src';

export default {
  schema: `${BASE}/lib/db/schema.ts`,
  out: `${BASE}/drizzle`,
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;