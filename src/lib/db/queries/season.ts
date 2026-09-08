import { eq, inArray } from 'drizzle-orm';
import { db } from '../client';
import { seasonConfig } from '../schema';

/**
 * 시즌 공통 설정.
 *
 * 모집 마감일 같은 날짜를 코드에 박으면 일정이 바뀔 때마다 배포해야 한다.
 * 대학 행사는 일정이 잘 바뀌므로 DB에 둔다.
 */
export const SEASON_KEYS = {
  recruitDeadline: {
    key: 'recruit_deadline',
    label: '모집 마감일',
    hint: '이 날짜에 팀을 일괄 확정합니다. 커넥트마다 다르지 않고 전체 공통입니다.',
    type: 'date' as const,
  },
  activityStart: {
    key: 'activity_start',
    label: '활동 시작일',
    hint: '가입 완료 안내에 표시됩니다.',
    type: 'date' as const,
  },
  rankingMode: {
    key: 'ranking_mode',
    label: '랭킹 공개 모드',
    hint: 'G-13 — 막판 비공개 구간에는 순위 없이 상위 5팀 팀명만 보여줍니다.',
    type: 'select' as const,
    options: [
      { value: 'full', label: '전체 공개' },
      { value: 'partial', label: '부분 공개 (상위 5팀 팀명만)' },
      { value: 'hidden', label: '비공개' },
    ],
  },
} as const;

export type SeasonKey = keyof typeof SEASON_KEYS;

export async function getSeasonConfig(): Promise<Record<string, string>> {
  const keys = Object.values(SEASON_KEYS).map((k) => k.key);
  const rows = await db
    .select({ key: seasonConfig.key, value: seasonConfig.value })
    .from(seasonConfig)
    .where(inArray(seasonConfig.key, keys));

  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSeasonValue(
  adminId: string,
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  await db
    .insert(seasonConfig)
    .values({ key, value, description, updatedBy: adminId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: seasonConfig.key,
      set: { value, updatedBy: adminId, updatedAt: new Date() },
    });
}

export async function getRankingMode(): Promise<'full' | 'partial' | 'hidden'> {
  const rows = await db
    .select({ value: seasonConfig.value })
    .from(seasonConfig)
    .where(eq(seasonConfig.key, SEASON_KEYS.rankingMode.key))
    .limit(1);
  const v = rows[0]?.value;
  return v === 'partial' || v === 'hidden' ? v : 'full';
}
