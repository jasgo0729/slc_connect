import { and, eq, isNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { memberships } from '@/lib/db/schema';
import { UPLOAD_LIMITS, createUploadTicket, storageEnabled } from '@/lib/storage/s3';

export const dynamic = 'force-dynamic';

/**
 * G-04 인증 사진 업로드 주소 발급.
 *
 * 브라우저가 S3로 직접 올린다. 서버를 거치면 EC2 대역폭과 메모리를
 * 먹고, 인증이 몰리는 시간대에 앱 응답까지 느려진다.
 *
 * 주소를 아무에게나 주지 않는다. 그 커넥트의 팀원인지 확인한다 —
 * 아니면 남의 버킷을 저장소로 쓸 수 있다.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  if (!storageEnabled()) {
    return Response.json({ error: '사진 저장소가 설정되지 않았어요.' }, { status: 503 });
  }

  let body: { connectId?: unknown; contentType?: unknown; bytes?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }

  const connectId = typeof body.connectId === 'string' ? body.connectId : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType : '';
  const bytes = Number(body.bytes);

  if (!connectId) return Response.json({ error: '커넥트를 찾을 수 없어요.' }, { status: 400 });

  const mine = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.connectId, connectId),
        eq(memberships.userId, user.id),
        isNull(memberships.leftAt),
      ),
    )
    .limit(1);
  if (mine.length === 0) {
    return Response.json({ error: '참여 중인 커넥트가 아니에요.' }, { status: 403 });
  }

  if (!UPLOAD_LIMITS.allowed.includes(contentType)) {
    return Response.json({ error: '사진 파일만 올릴 수 있어요.' }, { status: 400 });
  }
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > UPLOAD_LIMITS.maxBytes) {
    const mb = Math.floor(UPLOAD_LIMITS.maxBytes / 1024 / 1024);
    return Response.json({ error: `${mb}MB 이하의 사진만 올릴 수 있어요.` }, { status: 400 });
  }

  const ticket = await createUploadTicket(connectId, contentType, bytes);
  if (!ticket) return Response.json({ error: '주소를 만들지 못했어요.' }, { status: 500 });

  return Response.json(ticket);
}
