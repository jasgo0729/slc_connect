import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { roster, sessions, users } from '@/lib/db/schema';
import type { User } from '@/lib/db/schema';

/**
 * 화면에서 쓰는 사용자 정보.
 *
 * 이름·기수·캠퍼스·SLC는 users가 아니라 roster에 있다. 명단이 원본이고
 * 사용자가 고칠 수 없는 값이라 복사해 두지 않았다. 대신 세션을 확인하는
 * 김에 함께 가져온다 — 헤더의 "○○○님" 하나 때문에 화면마다 조회를
 * 한 번 더 하게 두지 않으려는 것이다.
 */
export type SessionUser = User & {
  name: string;
  cohort: string;
  campus: string;
  slc: string;
};

/**
 * 세션
 *
 * 쿠키에는 원본 토큰을, DB에는 SHA-256 해시만 둔다.
 * DB 백업이 유출돼도 그것만으로 남의 세션을 흉내 낼 수 없다.
 *
 * U-08 "최대한 오래" → 90일. 접속할 때마다 연장하되,
 * 매 요청 쓰기를 피하려고 남은 기간이 절반 아래로 떨어졌을 때만 갱신한다.
 */

export const SESSION_COOKIE = 'connect_session';
const TTL_DAYS = 90;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: TTL_DAYS * 24 * 60 * 60,
});

/** 로그인 성공 시 호출. 세션 행을 만들고 쿠키를 심는다. */
export async function createSession(userId: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.insert(sessions).values({
    tokenHash: hash(token),
    userId,
    expiresAt,
    userAgent,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions());
}

/**
 * 현재 사용자. 로그인하지 않았거나 세션이 만료됐으면 null.
 *
 * 레이아웃과 서버 액션에서 부른다. proxy에서는 부르지 않는다
 * (네트워크 수준 작업만 두는 것이 권장된다).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      user: users,
      name: roster.name,
      cohort: roster.cohort,
      campus: roster.campus,
      slc: roster.slc,
      expiresAt: sessions.expiresAt,
      id: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // 남은 기간이 절반 아래면 연장한다.
  const remaining = row.expiresAt.getTime() - Date.now();
  if (remaining < TTL_MS / 2) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + TTL_MS) })
      .where(eq(sessions.id, row.id));
  }

  return {
    ...row.user,
    name: row.name,
    cohort: row.cohort,
    campus: row.campus,
    slc: row.slc,
  };
}

/** 관리자 화면에서 사용. proxy와 별개로 서버에서 한 번 더 본다. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/** 로그아웃. 세션 행을 지우고 쿠키를 비운다. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hash(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * 만료된 세션 정리.
 *
 * 크론을 두지 않기로 했으므로 관리자 대시보드를 열 때 함께 부른다.
 * 남아 있어도 로그인에는 쓰이지 않으니(만료 조건으로 걸러진다)
 * 급한 작업은 아니다.
 */
export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
