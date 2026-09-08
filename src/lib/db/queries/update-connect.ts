import { and, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { connects, memberships } from '../schema';
import type { CreateInput } from './create-connect';

/**
 * C-09 수정 후 재신청.
 *
 * 반려된 정성 커넥트를 고쳐 다시 확인 요청한다. 새로 만들게 하면
 * 초대 링크가 바뀌고 이미 신청한 사람의 이력이 끊긴다.
 *
 * 트랙은 바꿀 수 없다. 참여 방식과 점수 계산이 통째로 달라서
 * 이미 신청한 사람이 다른 규칙의 팀에 들어가게 된다.
 */
export type UpdateResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' | 'NOT_LEADER' | 'LOCKED' };

export type UpdateInput = Omit<CreateInput, 'track' | 'isPublic'> & { isPublic: boolean };

export async function updateConnect(
  userId: string,
  connectId: string,
  input: UpdateInput,
): Promise<UpdateResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);

    const c = rows[0];
    if (!c) return { ok: false, reason: 'NOT_FOUND' } as const;

    const leader = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.userId, userId),
          eq(memberships.role, 'leader'),
          sql`${memberships.leftAt} IS NULL`,
        ),
      )
      .limit(1);
    if (leader.length === 0) return { ok: false, reason: 'NOT_LEADER' } as const;

    // 확정된 팀은 손댈 수 없다. 점수와 상금이 걸린 구성이다.
    if (c.status === 'confirmed' || c.confirmedAt) {
      return { ok: false, reason: 'LOCKED' } as const;
    }

    // 이미 들어온 사람보다 정원을 낮출 수 없다.
    const counted = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.connectId, connectId), sql`${memberships.leftAt} IS NULL`));
    const capacity = Math.max(input.capacity, counted[0]?.n ?? 1);

    const isQual = c.track === 'qualitative';

    // 반려된 커넥트를 고치면 다시 확인 대기로 돌아간다(C-09).
    const status =
      c.status === 'rejected' ? 'pending_review' : c.status;

    await tx
      .update(connects)
      .set({
        name: input.name,
        tagline: input.tagline,
        description: input.description,
        campus: input.campus,
        location: input.location ?? null,
        contact: input.contact ?? null,
        capacity,
        availableDays: input.availableDays,
        conditions: input.conditions,
        isPublic: input.isPublic,
        goalType: isQual ? (input.goalType ?? null) : null,
        goalDetail: isQual ? (input.goalDetail ?? null) : null,
        goalDate: isQual ? (input.goalDate ?? null) : null,
        activityPeriod: isQual ? (input.activityPeriod ?? null) : null,
        status,
        // 다시 신청했으므로 이전 반려 사유는 지운다.
        rejectionReason: c.status === 'rejected' ? null : c.rejectionReason,
      })
      .where(eq(connects.id, connectId));

    return { ok: true } as const;
  });
}
