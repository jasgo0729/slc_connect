import { CHALLENGE } from './rules';

/**
 * §9.3 도전 트랙 정량 평가 · 활동 횟수 (20%).
 *
 *   오프라인 4회 이상을 포함해 총 8회 이상 활동 시 만점.
 *   미달 1회당 2% 감점.
 *
 * ── 미달 횟수를 어떻게 세는가 ──
 *
 * 조건이 둘(총 8회, 오프라인 4회)이지만 미달을 따로 더하지 않는다.
 * 오프라인 활동 한 번은 두 조건을 동시에 채우기 때문이다.
 *
 *   총 6회 · 오프라인 2회  → 오프라인 2회를 더 하면 총 8 · 오프라인 4
 *                            → 미달은 2회 (4회가 아니다)
 *
 * 그래서 "만점까지 더 해야 하는 활동 수" = max(총 부족, 오프라인 부족).
 *
 * DB 를 모르는 순수 함수다. 화면에서도 읽는다.
 */

export interface ChallengeActivity {
  /** 'YYYY-MM-DD' */
  activityDate: string;
  /** 'offline' | 'cross' | 'online' */
  activityType: string;
}

export interface ChallengeProgress {
  total: number;
  offline: number;
  /** 만점까지 더 해야 하는 활동 수. */
  missing: number;
  /** 이 항목 점수(%). 0 ~ 20. */
  percent: number;
}

/**
 * 오프라인으로 치는 유형.
 *
 * CCC 도 사람이 모여 만나는 활동이고 §9.3 은 "활동 인증은 6.8 의
 * 오프라인 활동 인증과 같은 방식"이라 했다. 온라인만 뺀다.
 */
function isOffline(type: string): boolean {
  return type !== 'online';
}

export function challengeProgress(activities: ChallengeActivity[]): ChallengeProgress {
  // 같은 날 두 번 올려도 한 번으로 센다. 하루에 인증을 쪼개 올려
  // 횟수를 채우는 것을 막는다. 오프라인은 그날 오프라인 활동이
  // 하나라도 있었는지로 센다.
  const days = new Set<string>();
  const offlineDays = new Set<string>();
  for (const a of activities) {
    days.add(a.activityDate);
    if (isOffline(a.activityType)) offlineDays.add(a.activityDate);
  }

  const total = days.size;
  const offline = offlineDays.size;

  const missing = Math.max(
    0,
    CHALLENGE.totalTarget - total,
    CHALLENGE.offlineTarget - offline,
  );
  const percent = Math.max(0, CHALLENGE.maxPercent - missing * CHALLENGE.penaltyPerMissing);

  return { total, offline, missing, percent };
}
