import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { applications, connects, favorites, mbtiResults, memberships, roster, tags, userTags, users } from '../schema';

/**
 * 마이페이지.
 *
 * 세 갈래로 나눈다 — 찜한 것, 신청한 것, 개설한 것.
 * 같은 커넥트가 여러 곳에 나오지 않도록 서로 겹치지 않게 자른다.
 * 개설한 커넥트는 '신청한' 목록에서 뺀다. 팀장은 신청한 적이 없다.
 */

export interface MyConnect {
  id: string;
  name: string;
  tagline: string;
  status: string;
  track: string;
  campus: string;
  capacity: number;
  memberCount: number;
  /** 신청 목록에서만 채워진다. */
  myApplication?: string;
  hasMessage?: boolean;
  myRole?: 'leader' | 'member' | string | null;
}

const memberCount = sql<number>`(
  SELECT COUNT(*)::int FROM memberships m
  WHERE m.connect_id = connects.id AND m.left_at IS NULL
)`;

const base = {
  id: connects.id,
  name: connects.name,
  tagline: connects.tagline,
  status: connects.status,
  track: connects.track,
  campus: connects.campus,
  capacity: connects.capacity,
  memberCount,
};

/** 내가 팀장인 커넥트. */
export async function getLedConnects(userId: string): Promise<MyConnect[]> {
  return db
    .select(base)
    .from(memberships)
    .innerJoin(connects, eq(memberships.connectId, connects.id))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.role, 'leader'),
        sql`${memberships.leftAt} IS NULL`,
      ),
    )
    .orderBy(desc(connects.createdAt));
}

/**
 * 내가 신청한 커넥트. 참여가 확정된 것과 대기 중인 것을 함께 담는다.
 *
 * 결과를 기다리는 사람에게는 "어떻게 됐지"가 하나의 질문이라
 * 승인된 것과 대기 중인 것을 갈라 두면 두 곳을 봐야 한다.
 * 거절된 건은 뺀다 — 결과 화면에서 이미 알렸고, 목록에 남기면
 * 볼 때마다 다시 확인하게 된다.
 */
export async function getAppliedConnects(userId: string): Promise<MyConnect[]> {
  const rows = await db
    .select({
      ...base,
      myApplication: applications.status,
      message: applications.message,
      role: memberships.role,
    })
    .from(applications)
    .innerJoin(connects, eq(applications.connectId, connects.id))
    .leftJoin(
      memberships,
      and(
        eq(memberships.connectId, connects.id),
        eq(memberships.userId, userId),
        sql`${memberships.leftAt} IS NULL`,
      ),
    )
    .where(
      and(
        eq(applications.userId, userId),
        inArray(applications.status, ['pending', 'approved']),
      ),
    )
    .orderBy(desc(applications.appliedAt));

  // 팀장이 자기 팀에 신청하는 일은 없지만, 이후에 팀장이 교체되면
  // 신청 이력이 남은 채로 팀장이 될 수 있다. 그때는 '개설한' 쪽에만 둔다.
  return rows
    .filter((r) => r.role !== 'leader')
    .map(({ role: _role, message, ...r }) => ({ ...r, hasMessage: Boolean(message) }));
}

/** D-08 찜한 커넥트. */
export async function getMyFavorites(userId: string): Promise<MyConnect[]> {
  return db
    .select(base)
    .from(favorites)
    .innerJoin(connects, eq(favorites.connectId, connects.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}

/** 개설한 커넥트마다 붙는 신청자 목록. 마이페이지에서 바로 처리한다. */
export interface LedApplicant {
  applicationId: string;
  connectId: string;
  name: string;
  hasMessage: boolean;
  message: string | null;
  status: 'pending' | 'approved';
}

export async function getApplicantsForLed(
  connectIds: string[],
): Promise<LedApplicant[]> {
  if (connectIds.length === 0) return [];

  const rows = await db
    .select({
      applicationId: applications.id,
      connectId: applications.connectId,
      name: roster.name,
      message: applications.message,
      status: applications.status,
    })
    .from(applications)
    .innerJoin(users, eq(applications.userId, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(
      and(
        inArray(applications.connectId, connectIds),
        inArray(applications.status, ['pending', 'approved']),
      ),
    )
    .orderBy(applications.appliedAt);

  return rows.map((r) => ({
    applicationId: r.applicationId,
    connectId: r.connectId,
    // 이름은 성만 남기고 가린다(All-04).
    name: r.name.length > 1 ? r.name[0] + 'O'.repeat(Math.min(r.name.length - 1, 2)) : r.name,
    hasMessage: Boolean(r.message),
    message: r.message,
    status: r.status as 'pending' | 'approved',
  }));
}

/** 프로필 폼에 되돌려 줄 값. 저장한 것이 다음에 열었을 때 그대로 보여야 한다. */
export async function getMyTags(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: tags.name })
    .from(userTags)
    .innerJoin(tags, eq(userTags.tagId, tags.id))
    .where(eq(userTags.userId, userId));
  return rows.map((r) => r.name);
}

/** A-07 Connect-MBTI 최신 결과. */
export async function getMyConnectMbti(userId: string): Promise<string | null> {
  const rows = await db
    .select({ code: mbtiResults.typeCode })
    .from(mbtiResults)
    .where(eq(mbtiResults.userId, userId))
    .orderBy(desc(mbtiResults.createdAt))
    .limit(1);
  return rows[0]?.code ?? null;
}
