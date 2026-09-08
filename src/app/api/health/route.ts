import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

/**
 * 상태 확인.
 *
 * 컨테이너 헬스체크와 배포 스크립트가 이 응답을 보고 판단한다.
 * DB까지 확인하는 이유는, 앱만 살아 있고 DB에 못 붙는 상태로
 * 배포가 "성공"으로 끝나는 것을 막기 위해서다.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ ok: false, db: false }, { status: 503 });
  }
}
