import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { connects } from '../schema';
import type { ConnectCardData } from '@/components/connect-card';

/**
 * B-01 씨앗판 목록.
 *
 * 비로그인에게도 보이는 화면이므로 여기서 참여자 정보를 가져오지 않는다.
 * 인원은 수만 센다. 이름·기수·SLC는 상세(B-02)부터다.
 *
 * 인원은 팀장을 포함한 수다. 개설 시점의 memberCount는 0이 아니라 1.
 *
 * 상관 서브쿼리는 반드시 테이블을 명시한다.
 *   memberships 에도 id 컬럼이 있어서 `WHERE connect_id = id` 로 쓰면
 *   Postgres가 안쪽 스코프를 먼저 찾아 memberships.id 로 해석한다.
 *   에러 없이 항상 0이 나오는, 조용히 틀리는 종류의 버그다.
 *   그래서 별칭 m 과 connects. 를 붙여 두 스코프를 갈라 둔다.
 */

export interface ListFilters {
  track?: string;
  campus?: string;
  sort?: string;
}

/** 목록에 오르는 상태. 비공개와 정성 확인 대기는 제외한다(C-11, C-08). */
const LISTED = ['recruiting', 'full_closed', 'early_closed', 'confirmed'];

const memberCount = sql<number>`(
  SELECT COUNT(*)::int FROM memberships m
  WHERE m.connect_id = connects.id AND m.left_at IS NULL
)`;

const favoriteCount = sql<number>`(
  SELECT COUNT(*)::int FROM favorites f
  WHERE f.connect_id = connects.id
)`;

export async function listConnects(f: ListFilters): Promise<ConnectCardData[]> {
  const where = [eq(connects.isPublic, true), inArray(connects.status, LISTED)];
  if (f.track === 'quantitative' || f.track === 'qualitative') {
    where.push(eq(connects.track, f.track));
  }
  if (f.campus) {
    where.push(eq(connects.campus, f.campus));
  }

  // B-06 정렬. 기본은 최신순 — 모집 초반에는 찜이 전부 0이라
  // 인기순을 기본값으로 두면 사실상 무작위가 된다.
  //
  // '마감임박'은 두지 않는다. 모집 마감일이 전 커넥트 공통이라
  // 남은 시간으로는 정렬이 성립하지 않는다. 대신 남은 자리 수로 센다.
  const orderBy =
    f.sort === 'spots'
      ? sql`(connects.capacity - ${memberCount}) ASC, connects.created_at DESC`
      : f.sort === 'popular'
        ? sql`${favoriteCount} DESC, connects.created_at DESC`
        : desc(connects.createdAt);

  const rows = await db
    .select({
      id: connects.id,
      name: connects.name,
      tagline: connects.tagline,
      track: connects.track,
      campus: connects.campus,
      status: connects.status,
      capacity: connects.capacity,
      memberCount,
      favoriteCount,
      createdAt: connects.createdAt,
    })
    .from(connects)
    .where(and(...where))
    .orderBy(orderBy);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}
