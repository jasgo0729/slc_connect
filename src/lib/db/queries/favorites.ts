import { and, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { favorites } from '../schema';

/**
 * D-08 찜하기.
 *
 * 토글이다. 이미 있으면 지우고 없으면 넣는다.
 * 두 번 빠르게 누르는 경우를 대비해 삽입 충돌은 무시한다.
 */
export async function toggleFavorite(userId: string, connectId: string): Promise<boolean> {
  const existing = await db
    .select({ userId: favorites.userId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.connectId, connectId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.connectId, connectId)));
    return false;
  }

  await db.insert(favorites).values({ userId, connectId }).onConflictDoNothing();
  return true;
}

/** 내가 찜한 커넥트 id 집합. 목록 화면에서 하트를 채우는 데 쓴다. */
export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ connectId: favorites.connectId })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  return new Set(rows.map((r) => r.connectId));
}

/**
 * 찜 수. U-06에 따라 정확한 숫자는 개설자에게만 보여준다.
 * 다른 사람에게는 노출하지 않으므로 호출하는 쪽에서 권한을 확인해야 한다.
 */
export async function countFavorites(connectId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(favorites)
    .where(eq(favorites.connectId, connectId));
  return rows[0]?.n ?? 0;
}
