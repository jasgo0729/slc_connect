import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../client';
import { applications, connects, memberships } from '../schema';

/**
 * G-15 이탈과 커넥트 삭제.
 *
 * 규칙이 확정 전후로 다르다. 판정 스위치는 connects.confirmedAt 이다.
 *
 *   확정 전  자유롭게 나간다. 전원 동의도 최소 4명도 적용하지 않는다.
 *   확정 후  전원 동의 / 4명 미만 불가 / 팀장은 후임 지정 필수.
 *
 * 팀장은 후임을 지정하고 나가야 한다. 혼자뿐이면 나갈 후임이 없으므로
 * 커넥트를 지우는 것이 유일한 길이다.
 */
export type LeaveResult =
  | { ok: true; deleted?: boolean }
  | { ok: false; reason: LeaveBlock };

export type LeaveBlock =
  | 'NOT_MEMBER'
  | 'NEED_SUCCESSOR' // 팀장인데 후임을 고르지 않았다
  | 'BAD_SUCCESSOR' // 후임이 이 팀 사람이 아니다
  | 'TOO_FEW' // 확정 후 4명 미만이 된다
  | 'CONFIRMED_LOCKED';

export const LEAVE_MESSAGES: Record<LeaveBlock, string> = {
  NOT_MEMBER: '참여 중인 커넥트가 아니에요.',
  NEED_SUCCESSOR: '다음 팀장을 정한 뒤에 나갈 수 있어요.',
  BAD_SUCCESSOR: '이 커넥트의 팀원 중에서 골라주세요.',
  TOO_FEW: '4명 미만이 되면 활동을 인정받지 못해요. 운영진에게 문의해 주세요.',
  CONFIRMED_LOCKED: '확정된 팀은 팀원 전원의 동의가 필요해요. 운영진에게 문의해 주세요.',
};

export async function leaveConnect(
  userId: string,
  connectId: string,
  successorId?: string,
): Promise<LeaveResult> {
  return db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);
    const c = locked[0];
    if (!c) return { ok: false, reason: 'NOT_MEMBER' } as const;

    const mineRows = await tx
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.userId, userId),
          sql`${memberships.leftAt} IS NULL`,
        ),
      )
      .limit(1);
    const mine = mineRows[0];
    if (!mine) return { ok: false, reason: 'NOT_MEMBER' } as const;

    const others = await tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          ne(memberships.userId, userId),
          sql`${memberships.leftAt} IS NULL`,
        ),
      );

    const confirmed = c.status === 'confirmed' || Boolean(c.confirmedAt);

    // 확정 후에는 4명 미만이 될 수 없다(G-15).
    if (confirmed && others.length + 1 - 1 < 4) {
      return { ok: false, reason: 'TOO_FEW' } as const;
    }

    // 팀장 혼자면 나갈 곳이 없다. 커넥트를 지운다.
    if (mine.role === 'leader' && others.length === 0) {
      if (confirmed) return { ok: false, reason: 'CONFIRMED_LOCKED' } as const;
      // 신청 이력은 남겨 두면 사라진 커넥트를 가리키게 되므로 함께 지운다.
      await tx.delete(applications).where(eq(applications.connectId, connectId));
      await tx.delete(memberships).where(eq(memberships.connectId, connectId));
      await tx.delete(connects).where(eq(connects.id, connectId));
      return { ok: true, deleted: true } as const;
    }

    if (mine.role === 'leader') {
      if (!successorId) return { ok: false, reason: 'NEED_SUCCESSOR' } as const;
      if (!others.some((o) => o.userId === successorId)) {
        return { ok: false, reason: 'BAD_SUCCESSOR' } as const;
      }

      // 순서가 중요하다. 후임을 먼저 올리면 팀장 유일성 인덱스에 걸린다.
      await tx
        .update(memberships)
        .set({ role: 'member' })
        .where(and(eq(memberships.connectId, connectId), eq(memberships.userId, userId)));

      await tx
        .update(memberships)
        .set({ role: 'leader' })
        .where(and(eq(memberships.connectId, connectId), eq(memberships.userId, successorId)));
    }

    await tx
      .update(memberships)
      .set({ leftAt: new Date() })
      .where(and(eq(memberships.connectId, connectId), eq(memberships.userId, userId)));

    // 나간 사람의 승인 이력을 닫는다. 남겨 두면 부분 유니크 인덱스
    // 때문에 같은 커넥트에 다시 신청할 수 없다.
    await tx
      .update(applications)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(
        and(
          eq(applications.connectId, connectId),
          eq(applications.userId, userId),
          eq(applications.status, 'approved'),
        ),
      );

    // 자리가 생겼으므로 정원 마감을 푼다.
    if (c.status === 'full_closed') {
      await tx.update(connects).set({ status: 'recruiting' }).where(eq(connects.id, connectId));
    }

    return { ok: true } as const;
  });
}

/** 팀장이 나갈 때 고를 후보. */
export async function getSuccessorCandidates(
  connectId: string,
  leaderId: string,
): Promise<{ id: string; label: string }[]> {
  const rows = await db
    .select({ userId: memberships.userId, joinedAt: memberships.joinedAt })
    .from(memberships)
    .where(
      and(
        eq(memberships.connectId, connectId),
        ne(memberships.userId, leaderId),
        sql`${memberships.leftAt} IS NULL`,
      ),
    )
    .orderBy(memberships.joinedAt);
  return rows.map((r) => ({ id: r.userId, label: r.userId }));
}
