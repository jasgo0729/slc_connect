import { and, asc, desc, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  adminAuditLog,
  applications,
  connects,
  memberships,
  notifications,
  roster,
  users,
} from '../schema';
import { CAPACITY_MAX, CAPACITY_MIN } from '@/lib/connects/options';

/* =========================================================
   J-01 커넥트 관리
   ========================================================= */

export interface AdminConnect {
  id: string;
  name: string;
  track: string;
  campus: string;
  status: string;
  isPublic: boolean;
  capacity: number;
  memberCount: number;
  applicationCount: number;
  favoriteCount: number;
  createdAt: Date;
  leaderName: string;
}

const memberCount = sql<number>`(
  SELECT COUNT(*)::int FROM memberships m
  WHERE m.connect_id = connects.id AND m.left_at IS NULL
)`;

export async function listAllConnects(status?: string): Promise<AdminConnect[]> {
  const where = status ? [eq(connects.status, status)] : [];

  return db
    .select({
      id: connects.id,
      name: connects.name,
      track: connects.track,
      campus: connects.campus,
      status: connects.status,
      isPublic: connects.isPublic,
      capacity: connects.capacity,
      createdAt: connects.createdAt,
      leaderName: roster.name,
      memberCount,
      applicationCount: sql<number>`(
        SELECT COUNT(*)::int FROM applications a
        WHERE a.connect_id = connects.id AND a.status = 'pending'
      )`,
      favoriteCount: sql<number>`(
        SELECT COUNT(*)::int FROM favorites f WHERE f.connect_id = connects.id
      )`,
    })
    .from(connects)
    .innerJoin(users, eq(connects.createdBy, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(connects.createdAt));
}

/**
 * D-07·J-06 유연 증원.
 *
 * 정원 상한은 7명이다. 관리자만 올릴 수 있게 한 이유는, 팀장이
 * 자유롭게 늘리면 활동 인정 최소 인원(G-06)과 균형이 깨지기 때문이다.
 * 이미 들어온 사람보다 낮출 수는 없다.
 */
export async function setCapacity(
  adminId: string,
  connectId: string,
  capacity: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!Number.isInteger(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX) {
    return { ok: false, reason: `정원은 ${CAPACITY_MIN}~${CAPACITY_MAX}명 사이여야 해요.` };
  }

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(connects)
      .where(eq(connects.id, connectId))
      .for('update')
      .limit(1);
    const c = rows[0];
    if (!c) return { ok: false, reason: '커넥트를 찾을 수 없어요.' } as const;

    const counted = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.connectId, connectId), sql`${memberships.leftAt} IS NULL`));
    const now = counted[0]?.n ?? 0;

    if (capacity < now) {
      return { ok: false, reason: `이미 ${now}명이 참여 중이라 그보다 낮출 수 없어요.` } as const;
    }

    // 정원이 늘면 마감이 풀린다. 정원 도달로 닫힌 경우에만.
    const status = c.status === 'full_closed' && capacity > now ? 'recruiting' : c.status;

    await tx.update(connects).set({ capacity, status }).where(eq(connects.id, connectId));
    await tx.insert(adminAuditLog).values({
      actorId: adminId,
      action: 'connect.capacity',
      target: connectId,
      detail: { name: c.name, from: c.capacity, to: capacity },
    });

    return { ok: true } as const;
  });
}

/* =========================================================
   J-02 인원 관리
   ========================================================= */

export interface MemberStats {
  rosterTotal: number;
  joined: number;
  inConnect: number;
  byCohort: { label: string; roster: number; joined: number }[];
  byCampus: { label: string; roster: number; joined: number }[];
}

export async function getMemberStats(): Promise<MemberStats> {
  const [total] = await db.select({ n: sql<number>`count(*)::int` }).from(roster);
  const [joined] = await db.select({ n: sql<number>`count(*)::int` }).from(users);

  const [inConnect] = await db
    .select({ n: sql<number>`count(distinct ${memberships.userId})::int` })
    .from(memberships)
    .where(sql`${memberships.leftAt} IS NULL`);

  const cohort = await db
    .select({
      label: roster.cohort,
      roster: sql<number>`count(*)::int`,
      joined: sql<number>`count(${users.id})::int`,
    })
    .from(roster)
    .leftJoin(users, eq(users.studentNo, roster.studentNo))
    .groupBy(roster.cohort)
    .orderBy(asc(roster.cohort));

  const campus = await db
    .select({
      label: roster.campus,
      roster: sql<number>`count(*)::int`,
      joined: sql<number>`count(${users.id})::int`,
    })
    .from(roster)
    .leftJoin(users, eq(users.studentNo, roster.studentNo))
    .groupBy(roster.campus);

  return {
    rosterTotal: total?.n ?? 0,
    joined: joined?.n ?? 0,
    inConnect: inConnect?.n ?? 0,
    byCohort: cohort,
    byCampus: campus,
  };
}

/**
 * D-14 인원 흡수 대상 추출.
 *
 * 가입은 했지만 어느 커넥트에도 속하지 않은 사람. 미달 팀에 연락할
 * 후보다. 실제 연락은 사람이 하므로 목록을 뽑아 주는 데까지만 한다.
 */
export interface UnassignedMember {
  id: string;
  name: string;
  cohort: string;
  campus: string;
  slc: string;
  email: string;
  bio: string | null;
  appliedCount: number;
}

export async function getUnassignedMembers(): Promise<UnassignedMember[]> {
  const assigned = db
    .select({ id: memberships.userId })
    .from(memberships)
    .where(sql`${memberships.leftAt} IS NULL`);

  return db
    .select({
      id: users.id,
      name: roster.name,
      cohort: roster.cohort,
      campus: roster.campus,
      slc: roster.slc,
      email: users.googleEmail,
      bio: users.bio,
      appliedCount: sql<number>`(
        SELECT COUNT(*)::int FROM applications a
        WHERE a.user_id = users.id AND a.status IN ('pending','rejected')
      )`,
    })
    .from(users)
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(notInArray(users.id, assigned))
    .orderBy(asc(roster.cohort), asc(roster.name));
}

/** 인원이 모자란 커넥트. D-10 경고와 D-14 흡수의 대상이다. */
export interface ShortConnect {
  id: string;
  name: string;
  campus: string;
  track: string;
  capacity: number;
  memberCount: number;
  pendingCount: number;
}

export async function getShortConnects(minimum = 4): Promise<ShortConnect[]> {
  const rows = await db
    .select({
      id: connects.id,
      name: connects.name,
      campus: connects.campus,
      track: connects.track,
      capacity: connects.capacity,
      memberCount,
      pendingCount: sql<number>`(
        SELECT COUNT(*)::int FROM applications a
        WHERE a.connect_id = connects.id AND a.status = 'pending'
      )`,
    })
    .from(connects)
    .where(inArray(connects.status, ['recruiting', 'full_closed', 'early_closed']))
    .orderBy(asc(connects.name));

  // G-06 활동 인정 최소 인원이 4명이라 그 아래는 시즌을 시작할 수 없다.
  return rows.filter((r) => r.memberCount < minimum);
}

/** D-13 씨앗판 클리닝 대상. 개설 후 오래 지나도록 아무도 신청하지 않은 커넥트. */
export async function getStaleConnects(days = 5): Promise<ShortConnect[]> {
  const rows = await db
    .select({
      id: connects.id,
      name: connects.name,
      campus: connects.campus,
      track: connects.track,
      capacity: connects.capacity,
      memberCount,
      pendingCount: sql<number>`(
        SELECT COUNT(*)::int FROM applications a WHERE a.connect_id = connects.id
      )`,
    })
    .from(connects)
    .where(
      and(
        inArray(connects.status, ['recruiting', 'early_closed']),
        sql`${connects.createdAt} < now() - (${days} || ' days')::interval`,
      ),
    )
    .orderBy(asc(connects.createdAt));

  return rows.filter((r) => r.memberCount <= 1 && r.pendingCount === 0);
}

/* =========================================================
   J-04 공지·알림 발송
   ========================================================= */

export type NotifyAudience = 'all' | 'leaders' | 'unassigned';

export const AUDIENCES: { value: NotifyAudience; label: string; hint: string }[] = [
  { value: 'all', label: '전체', hint: '가입한 모든 사람' },
  { value: 'leaders', label: '팀장만', hint: '운영 단계의 전달은 팀장을 통한다(H-07)' },
  { value: 'unassigned', label: '커넥트 미소속', hint: '아직 어디에도 속하지 않은 사람' },
];

async function resolveAudience(audience: NotifyAudience): Promise<string[]> {
  if (audience === 'leaders') {
    const rows = await db
      .selectDistinct({ id: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.role, 'leader'), sql`${memberships.leftAt} IS NULL`));
    return rows.map((r) => r.id);
  }

  if (audience === 'unassigned') {
    return (await getUnassignedMembers()).map((m) => m.id);
  }

  const rows = await db.select({ id: users.id }).from(users);
  return rows.map((r) => r.id);
}

/** 대상 인원 미리 세기. 보내기 전에 몇 명에게 가는지 알아야 한다. */
export async function countAudience(audience: NotifyAudience): Promise<number> {
  return (await resolveAudience(audience)).length;
}

/**
 * J-04 공지 발송.
 *
 * H-07에 따라 개인 대상 알림은 두지 않는다. 전체·팀장·미소속 셋뿐이다.
 * 웹 푸시와 이메일은 아직 붙지 않았으므로 지금은 앱 안의 알림함에만 쌓인다.
 */
export async function sendNotice(
  adminId: string,
  audience: NotifyAudience,
  title: string,
  body: string,
  link?: string | null,
): Promise<number> {
  const ids = await resolveAudience(audience);
  if (ids.length === 0) return 0;

  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    await db.insert(notifications).values(
      ids.slice(i, i + CHUNK).map((userId) => ({
        userId,
        type: 'notice',
        title,
        body,
        link: link || null,
      })),
    );
  }

  await db.insert(adminAuditLog).values({
    actorId: adminId,
    action: 'notice.send',
    detail: { audience, title, count: ids.length },
  });

  return ids.length;
}

/* =========================================================
   D-16 · J-08 팀 확정 일괄 처리
   ========================================================= */

export interface ConfirmPreview {
  connects: number;
  members: number;
  shortConnects: { id: string; name: string; memberCount: number }[];
  pendingApplications: number;
  privateToPublic: number;
  alreadyConfirmed: number;
}

const OPEN_STATUSES = ['recruiting', 'full_closed', 'early_closed', 'private'];

/**
 * 확정 전에 무엇이 바뀌는지 보여준다.
 *
 * 되돌릴 수 없는 조작이라 숫자가 예상과 다르면 그 자리에서 멈출 수
 * 있어야 한다. 특히 미달 팀은 확정하면 그대로 시즌을 시작하게 되므로
 * 먼저 D-14 인원 흡수를 끝내야 한다.
 */
export async function getConfirmPreview(): Promise<ConfirmPreview> {
  const rows = await db
    .select({ id: connects.id, name: connects.name, isPublic: connects.isPublic, memberCount })
    .from(connects)
    .where(inArray(connects.status, OPEN_STATUSES));

  const [pending] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(applications)
    .where(eq(applications.status, 'pending'));

  const [confirmed] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(connects)
    .where(eq(connects.status, 'confirmed'));

  const ids = rows.map((r) => r.id);
  const [mem] = ids.length
    ? await db
        .select({ n: sql<number>`count(distinct ${memberships.userId})::int` })
        .from(memberships)
        .where(and(inArray(memberships.connectId, ids), sql`${memberships.leftAt} IS NULL`))
    : [{ n: 0 }];

  return {
    connects: rows.length,
    members: mem?.n ?? 0,
    shortConnects: rows
      .filter((r) => r.memberCount < 4)
      .map((r) => ({ id: r.id, name: r.name, memberCount: r.memberCount })),
    pendingApplications: pending?.n ?? 0,
    privateToPublic: rows.filter((r) => !r.isPublic).length,
    alreadyConfirmed: confirmed?.n ?? 0,
  };
}

/**
 * D-16 팀 확정 일괄 처리.
 *
 * 상태 전환과 C-12 비공개 공개를 한 트랜잭션으로 묶는다.
 * 절반만 바뀐 상태는 복구가 어렵다.
 *
 * 알림은 커밋 뒤에 따로 보낸다 — 발송이 실패해도 확정은 유지되어야 한다.
 */
export async function confirmAllTeams(
  adminId: string,
): Promise<{ connects: number; notified: number }> {
  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: connects.id })
      .from(connects)
      .where(inArray(connects.status, OPEN_STATUSES))
      .for('update');

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return { ids: [] as string[], members: [] as string[] };

    // C-12 매칭 완료 후 비공개 커넥트를 일괄 공개한다.
    await tx
      .update(connects)
      .set({ status: 'confirmed', confirmedAt: new Date(), isPublic: true })
      .where(inArray(connects.id, ids));

    // 대기 중인 신청은 더 이상 처리될 수 없다. 정리해 두지 않으면
    // 신청자의 마이페이지에 영원히 '승인 대기중'으로 남는다.
    await tx
      .update(applications)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(and(inArray(applications.connectId, ids), eq(applications.status, 'pending')));

    const mem = await tx
      .selectDistinct({ id: memberships.userId })
      .from(memberships)
      .where(and(inArray(memberships.connectId, ids), sql`${memberships.leftAt} IS NULL`));

    await tx.insert(adminAuditLog).values({
      actorId: adminId,
      action: 'season.confirm',
      detail: { connects: ids.length, members: mem.length },
    });

    return { ids, members: mem.map((m) => m.id) };
  });

  if (result.members.length === 0) return { connects: result.ids.length, notified: 0 };

  const CHUNK = 500;
  for (let i = 0; i < result.members.length; i += CHUNK) {
    await db.insert(notifications).values(
      result.members.slice(i, i + CHUNK).map((userId) => ({
        userId,
        type: 'season_confirmed',
        title: '팀이 확정됐어요',
        body: '참여할 커넥트가 정해졌어요. 마이페이지에서 확인해 주세요.',
        link: '/me',
      })),
    );
  }

  return { connects: result.ids.length, notified: result.members.length };
}

/** 최근 관리자 조작 기록. 되돌리기 어려운 일이 언제 누구에 의해 있었는지. */
export async function getRecentAudit(limit = 20) {
  return db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      target: adminAuditLog.target,
      detail: adminAuditLog.detail,
      createdAt: adminAuditLog.createdAt,
      actorName: roster.name,
    })
    .from(adminAuditLog)
    .innerJoin(users, eq(adminAuditLog.actorId, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}
