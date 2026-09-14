import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  adminAuditLog,
  applications,
  connects,
  favorites,
  mbtiResults,
  memberships,
  roster,
  users,
} from '../schema';

/**
 * J-02 인원 관리 — 개인 단위 조회.
 *
 * 문의가 들어왔을 때 "이 사람이 지금 어떤 상태인가"를 한 화면에서
 * 볼 수 있어야 한다. 가입은 했는지, 어느 커넥트에 있는지, 신청이
 * 어디서 막혀 있는지를 따로 찾아다니면 답이 늦어진다.
 *
 * 명단(roster)을 기준으로 조회한다. 아직 가입하지 않은 사람도
 * 목록에 나와야 "누가 안 들어왔나"를 볼 수 있다.
 */
export interface AdminUserRow {
  id: string;
  studentNo: string;
  name: string;
  cohort: string;
  campus: string;
  slc: string;
  role: string;
  lastLoginAt: Date | null;
  connectCount: number;
  /** 소속 커넥트 이름. 목록에서 바로 보이면 상세를 안 열어도 된다. */
  connectNames: string[];
}

export interface UserQuery {
  q?: string;
  cohort?: string;
  campus?: string;
  slc?: string;
  /** 'in' 소속 있음 · 'none' 미소속 */
  belonging?: string;
}

/**
 * 가입자 목록.
 *
 * 소속 커넥트 이름까지 함께 낸다. 이름만 나오면 문의가 올 때마다
 * 상세를 한 번씩 더 열어야 한다.
 */
export async function listUsers(f: UserQuery = {}): Promise<AdminUserRow[]> {
  const where = [];

  const q = (f.q ?? '').trim();
  if (q) {
    const like = `%${q}%`;
    where.push(sql`(${roster.name} ILIKE ${like} OR ${roster.studentNo} LIKE ${like})`);
  }
  if (f.cohort) where.push(eq(roster.cohort, f.cohort));
  if (f.campus) where.push(eq(roster.campus, f.campus));
  if (f.slc) where.push(eq(roster.slc, f.slc));

  const rows = await db
    .select({
      id: users.id,
      studentNo: roster.studentNo,
      name: roster.name,
      cohort: roster.cohort,
      campus: roster.campus,
      slc: roster.slc,
      role: users.role,
      lastLoginAt: users.lastLoginAt,
      connectCount: sql<number>`(
        SELECT COUNT(*)::int FROM memberships m
        WHERE m.user_id = users.id AND m.left_at IS NULL
      )`,
      connectNames: sql<string[]>`COALESCE((
        SELECT array_agg(c.name ORDER BY m.joined_at)
        FROM memberships m JOIN connects c ON c.id = m.connect_id
        WHERE m.user_id = users.id AND m.left_at IS NULL
      ), ARRAY[]::text[])`,
    })
    .from(users)
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(asc(roster.cohort), asc(roster.name))
    .limit(400);

  if (f.belonging === 'none') return rows.filter((r) => r.connectCount === 0);
  if (f.belonging === 'in') return rows.filter((r) => r.connectCount > 0);
  return rows;
}

/** 필터에 쓸 값 목록. 명단에 실제로 있는 것만 낸다. */
export async function getUserFacets(): Promise<{
  cohorts: string[];
  campuses: string[];
  slcs: string[];
}> {
  const rows = await db
    .selectDistinct({ cohort: roster.cohort, campus: roster.campus, slc: roster.slc })
    .from(roster);

  const uniq = (xs: string[]) => [...new Set(xs)].filter(Boolean).sort();
  return {
    cohorts: uniq(rows.map((r) => r.cohort)),
    campuses: uniq(rows.map((r) => r.campus)),
    slcs: uniq(rows.map((r) => r.slc)),
  };
}

/**
 * 명단에는 있는데 아직 로그인하지 않은 사람.
 *
 * 모집 독려의 1차 대상이다. 커넥트를 못 고른 게 아니라 아예
 * 들어오지 않은 것이라, 접근 방법이 다르다.
 */
export async function getNotJoined(): Promise<
  { studentNo: string; name: string; cohort: string; campus: string; slc: string }[]
> {
  return db
    .select({
      studentNo: roster.studentNo,
      name: roster.name,
      cohort: roster.cohort,
      campus: roster.campus,
      slc: roster.slc,
    })
    .from(roster)
    .leftJoin(users, eq(users.studentNo, roster.studentNo))
    .where(isNull(users.id))
    .orderBy(asc(roster.cohort), asc(roster.name));
}

/* ── 개인 상세 ─────────────────────────────────────────── */

export interface AdminUserDetail {
  userId: string;
  studentNo: string;
  name: string;
  cohort: string;
  campus: string;
  slc: string;
  major: string | null;

  email: string;
  role: string;
  googleHd: string | null;
  boundAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  emailBouncedAt: Date | null;

  bio: string | null;
  residence: string | null;
  interests: string | null;
  mbtiType: string | null;
  connectMbti: string | null;

  memberships: { connectId: string; name: string; track: string; role: string; joinedAt: Date }[];
  applications: {
    connectId: string;
    name: string;
    status: string;
    appliedAt: Date;
    decidedAt: Date | null;
  }[];
  favoriteCount: number;
}

/**
 * 개인 상세.
 *
 * "제가 신청했는데 안 보여요" 같은 문의를 받았을 때 여는 화면의
 * 재료다. 가입·결속·소속·신청을 한 번에 가져온다. 나눠 부르면
 * 화면이 여러 번 왕복하고, 그사이 상태가 바뀌면 앞뒤가 안 맞는다.
 */
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const base = await db
    .select({
      userId: users.id,
      studentNo: users.studentNo,
      email: users.googleEmail,
      role: users.role,
      googleHd: users.googleHd,
      boundAt: users.boundAt,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      emailBouncedAt: users.emailBouncedAt,
      bio: users.bio,
      residence: users.residence,
      interests: users.interests,
      mbtiType: users.mbtiType,
      name: roster.name,
      cohort: roster.cohort,
      campus: roster.campus,
      slc: roster.slc,
      major: roster.major,
    })
    .from(users)
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(eq(users.id, userId))
    .limit(1);

  const u = base[0];
  if (!u) return null;

  const [joined, applied, favs, mbti] = await Promise.all([
    db
      .select({
        connectId: connects.id,
        name: connects.name,
        track: connects.track,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(connects, eq(memberships.connectId, connects.id))
      .where(and(eq(memberships.userId, userId), isNull(memberships.leftAt)))
      .orderBy(asc(memberships.joinedAt)),

    db
      .select({
        connectId: connects.id,
        name: connects.name,
        status: applications.status,
        appliedAt: applications.appliedAt,
        decidedAt: applications.decidedAt,
      })
      .from(applications)
      .innerJoin(connects, eq(applications.connectId, connects.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.appliedAt))
      .limit(30),

    db
      .select({ n: sql<number>`count(*)::int` })
      .from(favorites)
      .where(eq(favorites.userId, userId)),

    db
      .select({ code: mbtiResults.typeCode })
      .from(mbtiResults)
      .where(eq(mbtiResults.userId, userId))
      .orderBy(desc(mbtiResults.createdAt))
      .limit(1),
  ]);

  return {
    ...u,
    memberships: joined,
    applications: applied,
    favoriteCount: favs[0]?.n ?? 0,
    connectMbti: mbti[0]?.code ?? null,
  };
}

/* ── 권한 ──────────────────────────────────────────────── */

export type RoleResult = { ok: true } | { ok: false; reason: string };

/**
 * A-08 관리자 권한 변경.
 *
 * 자기 권한은 내리지 못한다. 혼자 남은 관리자가 실수로 내리면
 * 아무도 되돌릴 수 없어 DB를 직접 고쳐야 한다.
 */
export async function setUserRole(
  actorId: string,
  targetUserId: string,
  role: 'member' | 'admin',
): Promise<RoleResult> {
  if (actorId === targetUserId) {
    return { ok: false, reason: '자기 권한은 바꿀 수 없어요.' };
  }

  const target = await db
    .select({ id: users.id, studentNo: users.studentNo })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (target.length === 0) return { ok: false, reason: '가입하지 않은 사람이에요.' };

  await db.update(users).set({ role }).where(eq(users.id, targetUserId));
  await db.insert(adminAuditLog).values({
    actorId,
    action: role === 'admin' ? 'user.grant_admin' : 'user.revoke_admin',
    target: targetUserId,
    detail: { studentNo: target[0]!.studentNo },
  });

  return { ok: true };
}

/* ── 커넥트별 구성원 ───────────────────────────────────── */

export interface RosterMember {
  userId: string;
  name: string;
  cohort: string;
  slc: string;
  campus: string;
  residence: string | null;
  role: string;
  joinedAt: Date;
}

export interface RosterApplicant {
  userId: string;
  name: string;
  cohort: string;
  slc: string;
  status: string;
  message: string | null;
  appliedAt: Date;
}

/**
 * 커넥트 구성원 명단.
 *
 * 누가 들어와 있고 누가 기다리는지를 실명으로 본다.
 * 씨앗판이 이름을 가리는 것(All-04)과 달리 여기서는 가리지 않는다.
 * 단톡방을 만들고(D+10) 문의에 답하려면 실명이 필요하고,
 * 이 화면은 관리자만 들어온다.
 */
export async function getConnectRoster(connectId: string) {
  const head = await db
    .select({
      id: connects.id,
      name: connects.name,
      tagline: connects.tagline,
      track: connects.track,
      campus: connects.campus,
      status: connects.status,
      capacity: connects.capacity,
      isPublic: connects.isPublic,
      isPreCreated: connects.isPreCreated,
      favoriteCount: sql<number>`(
        SELECT COUNT(*)::int FROM favorites f WHERE f.connect_id = connects.id
      )`,
    })
    .from(connects)
    .where(eq(connects.id, connectId))
    .limit(1);

  const c = head[0];
  if (!c) return null;

  const [members, applicants] = await Promise.all([
    db
      .select({
        userId: users.id,
        name: roster.name,
        cohort: roster.cohort,
        slc: roster.slc,
        campus: roster.campus,
        residence: users.residence,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(roster, eq(users.studentNo, roster.studentNo))
      .where(and(eq(memberships.connectId, connectId), isNull(memberships.leftAt)))
      // 팀장이 먼저, 그다음 들어온 순서.
      .orderBy(desc(memberships.role), asc(memberships.joinedAt)),

    db
      .select({
        userId: users.id,
        name: roster.name,
        cohort: roster.cohort,
        slc: roster.slc,
        status: applications.status,
        message: applications.message,
        appliedAt: applications.appliedAt,
      })
      .from(applications)
      .innerJoin(users, eq(applications.userId, users.id))
      .innerJoin(roster, eq(users.studentNo, roster.studentNo))
      .where(eq(applications.connectId, connectId))
      .orderBy(desc(applications.appliedAt)),
  ]);

  return { ...c, members, applicants };
}
