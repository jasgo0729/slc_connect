import { and, eq, gte, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { connects, memberships, recommendationLogs } from '../schema';

/**
 * E절 추천에 쓰는 조회들.
 *
 * 추천 후보는 "지금 이 사람이 실제로 들어갈 수 있는 커넥트"여야 한다.
 * 자리가 없거나 이미 같은 트랙에 속해 있어 신청조차 못 하는 것을
 * 추천하면, 눌러 본 뒤에야 막히는 걸 알게 된다.
 */

export interface Candidate {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  track: string;
  status: string;
  campus: string;
  capacity: number;
  memberCount: number;
  availableDays: number[];
  conditions: string[];
  goalDetail: string | null;
}

const memberCount = sql<number>`(
  SELECT COUNT(*)::int FROM memberships m
  WHERE m.connect_id = connects.id AND m.left_at IS NULL
)`;

/** 이 사람이 이미 속한 트랙. 그 트랙의 커넥트는 후보에서 뺀다. */
async function occupiedTracks(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ track: connects.track })
    .from(memberships)
    .innerJoin(connects, eq(memberships.connectId, connects.id))
    .where(and(eq(memberships.userId, userId), sql`${memberships.leftAt} IS NULL`));
  return rows.map((r) => r.track);
}

export async function getCandidates(userId: string): Promise<Candidate[]> {
  const taken = await occupiedTracks(userId);

  const joined = db
    .select({ id: memberships.connectId })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), sql`${memberships.leftAt} IS NULL`));

  const rows = await db
    .select({
      id: connects.id,
      name: connects.name,
      tagline: connects.tagline,
      description: connects.description,
      track: connects.track,
      status: connects.status,
      campus: connects.campus,
      capacity: connects.capacity,
      availableDays: connects.availableDays,
      conditions: connects.conditions,
      goalDetail: connects.goalDetail,
      memberCount,
    })
    .from(connects)
    .where(
      and(
        eq(connects.isPublic, true),
        // 확인 대기와 확정은 지금 신청할 수 없다.
        inArray(connects.status, ['recruiting', 'early_closed']),
        taken.length > 0 ? notInArray(connects.track, taken) : undefined,
        notInArray(connects.id, joined),
      ),
    );

  // 자리가 없는 것은 뺀다. SQL로 걸러도 되지만 인원 계산이
  // 서브쿼리라 조건에 넣으면 인덱스를 못 쓴다. 30개 규모라 여기서 한다.
  return rows
    .filter((r) => r.memberCount < r.capacity)
    .map((r) => ({
      ...r,
      availableDays: r.availableDays ?? [],
      conditions: r.conditions ?? [],
    }));
}

/**
 * E-09 호출 제한.
 *
 * LLM 호출은 돈이 들고, 같은 사람이 반복해서 눌러도 결과가 크게
 * 달라지지 않는다. 한 시간에 열 번이면 충분히 넉넉하다.
 */
const WINDOW_MINUTES = 60;
const MAX_CALLS = 10;

export async function countRecentCalls(userId: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(recommendationLogs)
    .where(and(eq(recommendationLogs.userId, userId), gte(recommendationLogs.createdAt, since)));
  return rows[0]?.n ?? 0;
}

export const RATE_LIMIT = { max: MAX_CALLS, windowMinutes: WINDOW_MINUTES };

export async function logRecommendation(
  userId: string,
  query: string,
  mode: string,
  resultIds: string[],
  isFallback: boolean,
): Promise<void> {
  await db.insert(recommendationLogs).values({
    userId,
    query,
    mode,
    resultIds,
    isFallback,
  });
}
