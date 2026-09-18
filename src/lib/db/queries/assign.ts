import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../client';
import { adminAuditLog, applications, connects, memberships, roster, users } from '../schema';

/**
 * J-02 · D-14 관리자 배정.
 *
 * 미달로 해산되는 팀의 인원을 자리가 남은 팀으로 옮기는 것이
 * 주 용도다. 본인이 직접 신청하게 하면 D+8~D+9의 짧은 기간에
 * 연락이 닿지 않는 사람이 생기고, 그만큼 자리가 비어 남는다.
 *
 * 트랙당 하나라는 규칙은 여기서도 지킨다. 다만 관리자는 '옮기기'로
 * 기존 소속을 정리하면서 넣을 수 있다 — 그게 흡수의 실제 모습이다.
 */
export type AssignBlock =
  | 'NOT_FOUND'
  | 'NOT_JOINED' // 아직 가입하지 않은 사람
  | 'ALREADY_MEMBER'
  | 'FULL'
  | 'IN_OTHER_TRACK' // 같은 트랙의 다른 커넥트에 속해 있다
  | 'CONFIRMED_LOCKED';

export const ASSIGN_MESSAGES: Record<AssignBlock, string> = {
  NOT_FOUND: '커넥트를 찾을 수 없어요.',
  NOT_JOINED: '아직 사이트에 가입하지 않은 사람이에요.',
  ALREADY_MEMBER: '이미 이 커넥트에 속해 있어요.',
  FULL: '정원이 찼어요. 정원을 늘린 뒤에 다시 시도해 주세요.',
  IN_OTHER_TRACK: '', // 커넥트 이름이 들어가야 해서 호출하는 쪽에서 만든다
  CONFIRMED_LOCKED: '확정된 팀은 구성을 바꿀 수 없어요.',
};

export type AssignResult =
  | { ok: true; connectName: string; movedFrom?: string }
  | { ok: false; reason: AssignBlock; conflictName?: string };

export async function assignMember(
  adminId: string,
  connectId: string,
  userId: string,
  /** 같은 트랙의 다른 커넥트에 속해 있으면 거기서 빼고 넣는다. */
  move = false,
): Promise<AssignResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);

    const c = rows[0];
    if (!c) return { ok: false, reason: 'NOT_FOUND' } as const;
    if (c.status === 'confirmed' || c.confirmedAt) {
      return { ok: false, reason: 'CONFIRMED_LOCKED' } as const;
    }

    const who = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (who.length === 0) return { ok: false, reason: 'NOT_JOINED' } as const;

    const mine = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.userId, userId),
          isNull(memberships.leftAt),
        ),
      )
      .limit(1);
    if (mine.length > 0) return { ok: false, reason: 'ALREADY_MEMBER' } as const;

    const counted = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.connectId, connectId), isNull(memberships.leftAt)));
    if ((counted[0]?.n ?? 0) >= c.capacity) return { ok: false, reason: 'FULL' } as const;

    // 같은 트랙의 다른 커넥트에 속해 있는지.
    const other = await tx
      .select({
        membershipId: memberships.id,
        connectId: connects.id,
        name: connects.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(connects, eq(memberships.connectId, connects.id))
      .where(
        and(
          eq(memberships.userId, userId),
          isNull(memberships.leftAt),
          eq(connects.track, c.track),
          ne(connects.id, connectId),
        ),
      )
      .limit(1);

    const conflict = other[0];
    if (conflict && !move) {
      return { ok: false, reason: 'IN_OTHER_TRACK', conflictName: conflict.name } as const;
    }

    let movedFrom: string | undefined;
    if (conflict) {
      // 팀장을 옮기면 그 팀이 팀장 없이 남는다. 남은 사람 중
      // 가장 먼저 들어온 사람에게 넘기고, 혼자였으면 그대로 둔다
      // (관리자가 그 커넥트를 따로 정리해야 한다).
      if (conflict.role === 'leader') {
        const next = await tx
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(
            and(
              eq(memberships.connectId, conflict.connectId),
              ne(memberships.userId, userId),
              isNull(memberships.leftAt),
            ),
          )
          .orderBy(memberships.joinedAt)
          .limit(1);

        if (next[0]) {
          await tx
            .update(memberships)
            .set({ role: 'member' })
            .where(eq(memberships.id, conflict.membershipId));
          await tx
            .update(memberships)
            .set({ role: 'leader' })
            .where(
              and(
                eq(memberships.connectId, conflict.connectId),
                eq(memberships.userId, next[0].userId),
              ),
            );
        }
      }

      await tx
        .update(memberships)
        .set({ leftAt: new Date() })
        .where(eq(memberships.id, conflict.membershipId));

      // 승인 이력을 닫지 않으면 부분 유니크 인덱스 때문에 그 커넥트에
      // 다시 신청할 수 없다.
      await tx
        .update(applications)
        .set({ status: 'cancelled', decidedAt: new Date() })
        .where(
          and(
            eq(applications.connectId, conflict.connectId),
            eq(applications.userId, userId),
            eq(applications.status, 'approved'),
          ),
        );

      movedFrom = conflict.name;
    }

    await tx.insert(memberships).values({ connectId, userId, role: 'member' });

    // 신청 이력도 남긴다. 마이페이지의 '신청한 커넥트'와 관리자
    // 화면의 신청 목록이 이 테이블을 읽는다.
    await tx
      .insert(applications)
      .values({ connectId, userId, status: 'approved', decidedAt: new Date() })
      .onConflictDoNothing();

    // 정원이 찼으면 마감으로 넘긴다.
    if ((counted[0]?.n ?? 0) + 1 >= c.capacity) {
      await tx.update(connects).set({ status: 'full_closed' }).where(eq(connects.id, connectId));
    }

    await tx.insert(adminAuditLog).values({
      actorId: adminId,
      action: 'member.assign',
      target: connectId,
      detail: { userId, connectName: c.name, movedFrom },
    });

    return { ok: true, connectName: c.name, movedFrom } as const;
  });
}

/**
 * 관리자가 참여자를 뺀다.
 *
 * 본인 이탈(G-15)과 달리 최소 인원을 따지지 않는다. 해산을
 * 처리하는 쪽이라 4명 아래로 내려가는 것이 목적인 경우가 있다.
 */
export async function removeMember(
  adminId: string,
  connectId: string,
  userId: string,
): Promise<{ ok: true; connectName: string } | { ok: false; reason: string }> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);
    const c = rows[0];
    if (!c) return { ok: false, reason: '커넥트를 찾을 수 없어요.' } as const;
    if (c.status === 'confirmed' || c.confirmedAt) {
      return { ok: false, reason: '확정된 팀은 구성을 바꿀 수 없어요.' } as const;
    }

    const mine = await tx
      .select({ id: memberships.id, role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.userId, userId),
          isNull(memberships.leftAt),
        ),
      )
      .limit(1);
    if (mine.length === 0) return { ok: false, reason: '참여 중인 사람이 아니에요.' } as const;

    // 팀장을 빼면 다음으로 들어온 사람에게 넘긴다.
    if (mine[0]!.role === 'leader') {
      const next = await tx
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(
          and(
            eq(memberships.connectId, connectId),
            ne(memberships.userId, userId),
            isNull(memberships.leftAt),
          ),
        )
        .orderBy(memberships.joinedAt)
        .limit(1);

      if (next[0]) {
        await tx.update(memberships).set({ role: 'member' }).where(eq(memberships.id, mine[0]!.id));
        await tx
          .update(memberships)
          .set({ role: 'leader' })
          .where(and(eq(memberships.connectId, connectId), eq(memberships.userId, next[0].userId)));
      }
    }

    await tx.update(memberships).set({ leftAt: new Date() }).where(eq(memberships.id, mine[0]!.id));
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

    // 자리가 생겼으므로 마감을 푼다.
    if (c.status === 'full_closed') {
      await tx.update(connects).set({ status: 'recruiting' }).where(eq(connects.id, connectId));
    }

    await tx.insert(adminAuditLog).values({
      actorId: adminId,
      action: 'member.remove',
      target: connectId,
      detail: { userId, connectName: c.name },
    });

    return { ok: true, connectName: c.name } as const;
  });
}

/** 배정할 사람을 찾는다. 이름·학번으로. */
export interface AssignCandidate {
  userId: string;
  name: string;
  cohort: string;
  slc: string;
  campus: string;
  studentNo: string;
  /** 같은 트랙에 이미 속한 커넥트. 있으면 '옮기기'가 된다. */
  currentInTrack: string | null;
}

export async function searchAssignable(
  connectId: string,
  query: string,
): Promise<AssignCandidate[]> {
  const q = query.trim();
  if (!q) return [];

  const target = await db
    .select({ track: connects.track })
    .from(connects)
    .where(eq(connects.id, connectId))
    .limit(1);
  if (target.length === 0) return [];
  const track = target[0]!.track;

  const like = `%${q}%`;
  const rows = await db
    .select({
      userId: users.id,
      name: roster.name,
      cohort: roster.cohort,
      slc: roster.slc,
      campus: roster.campus,
      studentNo: roster.studentNo,
      currentInTrack: sql<string | null>`(
        SELECT c.name FROM memberships m
        JOIN connects c ON c.id = m.connect_id
        WHERE m.user_id = users.id AND m.left_at IS NULL
          AND c.track = ${track} AND c.id <> ${connectId}
        LIMIT 1
      )`,
    })
    .from(users)
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(sql`(${roster.name} ILIKE ${like} OR ${roster.studentNo} LIKE ${like})`)
    .limit(20);

  // 이미 이 커넥트에 있는 사람은 뺀다.
  const here = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.connectId, connectId), isNull(memberships.leftAt)));
  const inHere = new Set(here.map((h) => h.userId));

  return rows.filter((r) => !inHere.has(r.userId));
}

/* ── 팀장 지정 ─────────────────────────────────────────── */

/**
 * 관리자가 팀장을 정한다.
 *
 * 사전 개설 커넥트는 팀장 없이 시작하므로 누군가는 정해야 한다.
 * 첫 만남에서 자율적으로 정하는 것이 원칙이지만(6.3), 그 전에
 * 연락을 받을 사람이 필요하거나 팀장이 이탈해 빈 경우가 생긴다.
 *
 * memberships 에 커넥트당 팀장 하나라는 부분 유니크 인덱스가 걸려
 * 있다. 새 팀장을 먼저 올리면 그 인덱스에 막히므로, 기존 팀장을
 * 내리는 것이 먼저다.
 */
export type LeaderResult =
  | { ok: true; name: string; previousUserId: string | null }
  | { ok: false; reason: string };

export async function setLeader(
  adminId: string,
  connectId: string,
  userId: string,
): Promise<LeaderResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);

    const c = rows[0];
    if (!c) return { ok: false, reason: '커넥트를 찾을 수 없어요.' } as const;
    if (c.status === 'confirmed' || c.confirmedAt) {
      return { ok: false, reason: '확정된 팀은 구성을 바꿀 수 없어요.' } as const;
    }

    const target = await tx
      .select({ id: memberships.id, role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.userId, userId),
          isNull(memberships.leftAt),
        ),
      )
      .limit(1);

    if (target.length === 0) {
      return { ok: false, reason: '이 커넥트의 팀원이 아니에요.' } as const;
    }
    if (target[0]!.role === 'leader') {
      return { ok: false, reason: '이미 팀장이에요.' } as const;
    }

    const current = await tx
      .select({ id: memberships.id, userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.role, 'leader'),
          isNull(memberships.leftAt),
        ),
      )
      .limit(1);

    // 순서가 중요하다. 새 팀장을 먼저 올리면 유니크 인덱스에 걸린다.
    if (current[0]) {
      await tx
        .update(memberships)
        .set({ role: 'member' })
        .where(eq(memberships.id, current[0].id));
    }

    await tx.update(memberships).set({ role: 'leader' }).where(eq(memberships.id, target[0]!.id));

    await tx.insert(adminAuditLog).values({
      actorId: adminId,
      action: 'member.set_leader',
      target: connectId,
      detail: { userId, connectName: c.name, previous: current[0]?.userId ?? null },
    });

    return { ok: true, name: c.name, previousUserId: current[0]?.userId ?? null } as const;
  });
}
