import { eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { connects, memberships } from '../schema';

/**
 * C-13 초대 링크 조회.
 *
 * 비로그인에게도 보이는 화면이므로 참여자 정보를 가져오지 않는다.
 * 인원은 수만 센다(All-04).
 */
export interface InvitePreview {
  id: string;
  name: string;
  tagline: string;
  track: string;
  campus: string;
  capacity: number;
  memberCount: number;
  status: string;
  isPublic: boolean;
  availableDays: number[];
}

export async function getConnectByInviteToken(token: string): Promise<InvitePreview | null> {
  const memberCount = sql<number>`(
    SELECT COUNT(*)::int FROM memberships m
    WHERE m.connect_id = connects.id AND m.left_at IS NULL
  )`;

  const rows = await db
    .select({
      id: connects.id,
      name: connects.name,
      tagline: connects.tagline,
      track: connects.track,
      campus: connects.campus,
      capacity: connects.capacity,
      status: connects.status,
      isPublic: connects.isPublic,
      availableDays: connects.availableDays,
      memberCount,
    })
    .from(connects)
    .where(eq(connects.inviteToken, token))
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return { ...r, availableDays: r.availableDays ?? [] };
}

/** 이미 참여 중이면 미리보기를 건너뛰고 바로 상세로 보낸다. */
export async function isMember(connectId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      sql`${memberships.connectId} = ${connectId}
        AND ${memberships.userId} = ${userId}
        AND ${memberships.leftAt} IS NULL`,
    )
    .limit(1);
  return rows.length > 0;
}
