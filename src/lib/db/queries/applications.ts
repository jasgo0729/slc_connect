import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { applications, connects, memberships, roster, users } from '../schema';

/**
 * D-01·D-02·D-03·D-04·D-06·D-12 신청과 승인.
 *
 * 모든 쓰기는 커넥트 행을 FOR UPDATE 로 잠근 뒤에 한다.
 * 초대 링크를 받은 여러 명이 같은 순간에 신청하면 남은 자리가
 * 하나여도 전원이 들어갈 수 있기 때문이다(D-04 보충).
 * 애플리케이션에서 세고 넣는 방식은 반드시 뚫린다.
 */

export type ApplyResult =
  | { ok: true; joined: boolean } // joined=true면 즉시 참여, false면 승인 대기
  | { ok: false; reason: ApplyBlock };

export type ApplyBlock =
  | 'NOT_FOUND'
  | 'CONFIRMED' // 팀 구성이 끝났다
  | 'PENDING_REVIEW' // 정성 확인 대기 중이라 아직 못 받는다
  | 'ALREADY_MEMBER'
  | 'ALREADY_APPLIED'
  | 'FULL';

export const APPLY_MESSAGES: Record<ApplyBlock, string> = {
  NOT_FOUND: '커넥트를 찾을 수 없어요.',
  CONFIRMED: '이미 팀 구성이 끝난 커넥트예요.',
  PENDING_REVIEW: '운영진 확인이 끝나면 신청할 수 있어요.',
  ALREADY_MEMBER: '이미 참여 중인 커넥트예요.',
  ALREADY_APPLIED: '이미 신청했어요. 팀장이 확인하면 알려드릴게요.',
  FULL: '자리가 모두 찼어요.',
};


/**
 * D-01 신청.
 *
 * 정량 트랙이 모집 중이면 즉시 참여한다. 정성 트랙이거나 팀장이
 * 조기 마감(D-06)한 경우에는 승인 대기로 남는다 — 조기 마감해도
 * 신청은 계속 받아야 나중에 미달 팀 인원 흡수에 쓸 수 있다.
 */
export async function applyToConnect(
  userId: string,
  connectId: string,
  /** 정성 트랙 지원서. 팀장이 판단할 유일한 재료다. */
  message?: string,
): Promise<ApplyResult> {
  return db.transaction(async (tx) => {
    // 이 잠금이 D-04의 전부다. 같은 커넥트에 대한 다른 신청은
    // 이 트랜잭션이 끝날 때까지 여기서 기다린다.
    const locked = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);

    const c = locked[0];
    if (!c) return { ok: false, reason: 'NOT_FOUND' } as const;
    if (c.status === 'confirmed' || c.confirmedAt) {
      return { ok: false, reason: 'CONFIRMED' } as const;
    }
    if (c.status === 'pending_review') {
      return { ok: false, reason: 'PENDING_REVIEW' } as const;
    }

    const already = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.userId, userId),
          sql`${memberships.leftAt} IS NULL`,
        ),
      )
      .limit(1);
    if (already.length > 0) return { ok: false, reason: 'ALREADY_MEMBER' } as const;

    const live = await tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.connectId, connectId),
          eq(applications.userId, userId),
          sql`${applications.status} IN ('pending', 'approved')`,
        ),
      )
      .limit(1);
    if (live.length > 0) return { ok: false, reason: 'ALREADY_APPLIED' } as const;

    const counted = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.connectId, connectId), sql`${memberships.leftAt} IS NULL`));
    const memberCount = counted[0]?.n ?? 0;

    if (memberCount >= c.capacity) {
      return { ok: false, reason: 'FULL' } as const;
    }

    const immediate = c.track === 'quantitative' && c.status === 'recruiting';

    await tx.insert(applications).values({
      connectId,
      userId,
      status: immediate ? 'approved' : 'pending',
      decidedAt: immediate ? new Date() : null,
      message: message?.trim() || null,
    });

    if (!immediate) return { ok: true, joined: false } as const;

    await tx.insert(memberships).values({ connectId, userId, role: 'member' });

    // D-05 정원 도달 자동 마감. 잠금 안에서 처리하므로 초과할 수 없다.
    if (memberCount + 1 >= c.capacity) {
      await tx.update(connects).set({ status: 'full_closed' }).where(eq(connects.id, connectId));
    }

    return { ok: true, joined: true } as const;
  });
}

export type DecideResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_LEADER' | 'NOT_FOUND' | 'NOT_PENDING' | 'FULL' };

/** 팀장 여부. 권한 판정은 항상 memberships를 본다(created_by가 아니라). */
async function isLeader(
  tx: typeof db,
  connectId: string,
  userId: string,
): Promise<boolean> {
  const rows = await tx
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
  return rows.length > 0;
}

/** D-02 승인. 정원을 다시 확인한다 — 신청 시점 이후에 자리가 찼을 수 있다. */
export async function approveApplication(
  leaderId: string,
  applicationId: string,
): Promise<DecideResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ app: applications, connectId: applications.connectId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    const found = rows[0];
    if (!found) return { ok: false, reason: 'NOT_FOUND' } as const;
    if (found.app.status !== 'pending') return { ok: false, reason: 'NOT_PENDING' } as const;

    const locked = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, found.connectId))
      .for('update')
      .limit(1);
    const c = locked[0];
    if (!c) return { ok: false, reason: 'NOT_FOUND' } as const;

    if (!(await isLeader(tx as unknown as typeof db, c.id, leaderId))) {
      return { ok: false, reason: 'NOT_LEADER' } as const;
    }

    const counted = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.connectId, c.id), sql`${memberships.leftAt} IS NULL`));
    const memberCount = counted[0]?.n ?? 0;
    if (memberCount >= c.capacity) return { ok: false, reason: 'FULL' } as const;

    await tx
      .update(applications)
      .set({ status: 'approved', decidedAt: new Date(), decidedBy: leaderId })
      .where(eq(applications.id, applicationId));

    await tx
      .insert(memberships)
      .values({ connectId: c.id, userId: found.app.userId, role: 'member' });

    if (memberCount + 1 >= c.capacity) {
      await tx.update(connects).set({ status: 'full_closed' }).where(eq(connects.id, c.id));
    }

    return { ok: true } as const;
  });
}

/** D-02·D-03 거절. 사유는 정형 문구 중에서 고른다. */
export async function rejectApplication(
  leaderId: string,
  applicationId: string,
  reason: string,
): Promise<DecideResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    const app = rows[0];
    if (!app) return { ok: false, reason: 'NOT_FOUND' } as const;
    if (app.status !== 'pending') return { ok: false, reason: 'NOT_PENDING' } as const;

    if (!(await isLeader(tx as unknown as typeof db, app.connectId, leaderId))) {
      return { ok: false, reason: 'NOT_LEADER' } as const;
    }

    await tx
      .update(applications)
      .set({
        status: 'rejected',
        decidedAt: new Date(),
        decidedBy: leaderId,
        rejectReason: reason,
      })
      .where(eq(applications.id, applicationId));

    return { ok: true } as const;
  });
}

/**
 * D-12 지원 취소.
 *
 * 확정 전에는 자유롭게 취소할 수 있다(U-02 결론). 취소 이력은
 * 남겨 두므로 재신청이 가능하다 — 살아 있는 지원만 중복을 막는
 * 부분 유니크 인덱스가 그래서 필요했다.
 */
export async function cancelApplication(
  userId: string,
  applicationId: string,
): Promise<DecideResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    const app = rows[0];
    if (!app) return { ok: false, reason: 'NOT_FOUND' } as const;
    if (app.status !== 'pending') return { ok: false, reason: 'NOT_PENDING' } as const;

    await tx
      .update(applications)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(eq(applications.id, applicationId));

    return { ok: true } as const;
  });
}

/** D-06 조기 마감·재개. 정원 전에 팀장이 스스로 닫는다. */
export async function setEarlyClosed(
  leaderId: string,
  connectId: string,
  closed: boolean,
): Promise<DecideResult> {
  return db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);
    const c = locked[0];
    if (!c) return { ok: false, reason: 'NOT_FOUND' } as const;

    if (!(await isLeader(tx as unknown as typeof db, connectId, leaderId))) {
      return { ok: false, reason: 'NOT_LEADER' } as const;
    }
    // 정원이 차서 닫힌 것과 팀장이 닫은 것은 다르다. 확정된 팀도 손대지 않는다.
    if (c.status !== 'recruiting' && c.status !== 'early_closed') {
      return { ok: false, reason: 'NOT_PENDING' } as const;
    }

    await tx
      .update(connects)
      .set({
        status: closed ? 'early_closed' : 'recruiting',
        closedAt: closed ? new Date() : null,
      })
      .where(eq(connects.id, connectId));

    return { ok: true } as const;
  });
}

/** 팀장 관리 화면에 보여줄 대기 중 신청. */
export interface PendingApplication {
  id: string;
  userId: string;
  name: string;
  cohort: string;
  campus: string;
  slc: string;
  major: string | null;
  bio: string | null;
  residence: string | null;
  mbtiType: string | null;
  message: string | null;
  appliedAt: Date;
}

export async function getPendingApplications(
  connectId: string,
): Promise<PendingApplication[]> {
  return db
    .select({
      id: applications.id,
      userId: applications.userId,
      name: roster.name,
      cohort: roster.cohort,
      campus: roster.campus,
      slc: roster.slc,
      major: roster.major,
      bio: users.bio,
      residence: users.residence,
      mbtiType: users.mbtiType,
      message: applications.message,
      appliedAt: applications.appliedAt,
    })
    .from(applications)
    .innerJoin(users, eq(applications.userId, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(and(eq(applications.connectId, connectId), eq(applications.status, 'pending')))
    .orderBy(asc(applications.appliedAt));
}

/** 상세 화면에서 내 신청 건을 취소할 수 있게 id가 필요하다. */
export async function getMyLiveApplication(
  connectId: string,
  userId: string,
): Promise<{ id: string; status: string; rejectReason: string | null } | null> {
  const rows = await db
    .select({
      id: applications.id,
      status: applications.status,
      rejectReason: applications.rejectReason,
    })
    .from(applications)
    .where(
      and(
        eq(applications.connectId, connectId),
        eq(applications.userId, userId),
        sql`${applications.status} IN ('pending', 'rejected')`,
      ),
    )
    .orderBy(sql`${applications.appliedAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}
