import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { adminAuditLog, connects, memberships, roster, users } from '../schema';

/**
 * J-05 정성(도전) 개설 확인과 반려.
 *
 * C-08에 따라 도전 트랙은 개설 즉시 씨앗판에 오르지 않는다.
 * 승인하는 사람이 없으면 개설자는 커넥트가 사라진 것처럼 느낀다 —
 * 이 화면이 없으면 도전 트랙 자체가 성립하지 않는다.
 */
export interface PendingConnect {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  campus: string;
  capacity: number;
  goalType: string | null;
  goalDetail: string | null;
  goalDate: string | null;
  activityPeriod: string | null;
  availableDays: number[];
  createdAt: Date;
  leaderName: string;
  leaderCohort: string;
  leaderSlc: string;
}

export async function getPendingConnects(): Promise<PendingConnect[]> {
  const rows = await db
    .select({
      id: connects.id,
      name: connects.name,
      tagline: connects.tagline,
      description: connects.description,
      campus: connects.campus,
      capacity: connects.capacity,
      goalType: connects.goalType,
      goalDetail: connects.goalDetail,
      goalDate: connects.goalDate,
      activityPeriod: connects.activityPeriod,
      availableDays: connects.availableDays,
      createdAt: connects.createdAt,
      leaderName: roster.name,
      leaderCohort: roster.cohort,
      leaderSlc: roster.slc,
    })
    .from(connects)
    .innerJoin(users, eq(connects.createdBy, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(eq(connects.status, 'pending_review'))
    .orderBy(asc(connects.createdAt));

  return rows.map((r) => ({ ...r, availableDays: r.availableDays ?? [] }));
}

export type ReviewResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' | 'NOT_PENDING' };

/**
 * 승인. 확인 대기에서 모집 중으로 옮긴다.
 *
 * 비공개로 만든 커넥트는 승인 후에도 목록에 오르지 않는다(C-11).
 * C-12에 따라 매칭 완료 시점에 일괄 공개된다.
 */
export async function approveConnect(
  adminId: string,
  connectId: string,
): Promise<ReviewResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);

    const c = rows[0];
    if (!c) return { ok: false, reason: 'NOT_FOUND' } as const;
    if (c.status !== 'pending_review') return { ok: false, reason: 'NOT_PENDING' } as const;

    await tx
      .update(connects)
      .set({
        status: c.isPublic ? 'recruiting' : 'private',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
      })
      .where(eq(connects.id, connectId));

    await tx.insert(adminAuditLog).values({
      actorId: adminId,
      action: 'connect.approve',
      target: connectId,
      detail: { name: c.name },
    });

    return { ok: true } as const;
  });
}

/** C-09 반려. 사유를 남겨야 개설자가 무엇을 고칠지 안다. */
export async function rejectConnect(
  adminId: string,
  connectId: string,
  reason: string,
): Promise<ReviewResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);

    const c = rows[0];
    if (!c) return { ok: false, reason: 'NOT_FOUND' } as const;
    if (c.status !== 'pending_review') return { ok: false, reason: 'NOT_PENDING' } as const;

    await tx
      .update(connects)
      .set({
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(connects.id, connectId));

    await tx.insert(adminAuditLog).values({
      actorId: adminId,
      action: 'connect.reject',
      target: connectId,
      detail: { name: c.name, reason },
    });

    return { ok: true } as const;
  });
}

/** 관리자 대시보드에 띄울 "오늘 처리할 것". 저장하지 않고 매번 센다. */
export async function getAdminCounts(): Promise<{ pendingConnects: number; connects: number; members: number }> {
  const [pc] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(connects)
    .where(eq(connects.status, 'pending_review'));

  const [total] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(connects)
    .where(inArray(connects.status, ['recruiting', 'full_closed', 'early_closed', 'confirmed']));

  const [mem] = await db
    .select({ n: sql<number>`count(distinct ${memberships.userId})::int` })
    .from(memberships)
    .where(sql`${memberships.leftAt} IS NULL`);

  return {
    pendingConnects: pc?.n ?? 0,
    connects: total?.n ?? 0,
    members: mem?.n ?? 0,
  };
}
