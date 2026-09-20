import { SCORING, SOCIAL_WEEKLY_LIMIT, minParticipants } from './rules';
import { resolveScoringWeek } from './week';

/**
 * 인증 → 점수 이벤트 (규칙서 §6.2 ~ §6.6).
 *
 * DB 를 모르는 순수 함수다. 인증 목록과 정원만 받아 이벤트 목록을
 * 돌려준다. 그래야 규칙을 화면 없이, 서버 없이 검증할 수 있다.
 *
 * ── 왜 한 건씩 더하지 않고 전부 다시 계산하는가 ──
 *
 * 승인 순서와 활동 순서가 다르기 때문이다. 팀이 월·수·금 활동을
 * 올렸는데 운영진이 금요일 건을 먼저 승인하면, "그 주의 첫 두 번"
 * 이 금요일과 그 다음 승인 건이 되어 버린다. 활동일 기준으로
 * 다시 매기지 않으면 누가 먼저 검수되었느냐가 점수를 가른다.
 *
 * 산출물(§6.6)은 전체 기간 5회 한도라 주 단위로도 닫히지 않는다.
 * 지난달 활동이 뒤늦게 승인되면 이미 준 산출물 점수의 순서가
 * 바뀐다. 그래서 계산 범위를 커넥트 전체로 잡는다.
 *
 * 커넥트 하나당 인증은 많아야 수십 건이라 전부 다시 계산해도 싸다.
 */

export interface ScorableCert {
  id: string;
  /** 'YYYY-MM-DD'. 주차와 순서의 기준이다. */
  activityDate: string;
  /** 본인 커넥트에서 참여한 인원. §6.3·§6.5 의 기준. */
  participantCount: number;
  /** §6.4 주제와 무관한 친목 활동. 기본 점수를 받지 못한다. */
  isSocial: boolean;
  /** §6.6 검수자가 매긴 등급. null 이면 평가하지 않았다. */
  deliverableScore: number | null;
  /** 같은 날 여러 건일 때의 순서. 올린 시각. */
  createdAt: number;
}

export interface ComputedEvent {
  certificationId: string;
  /** score_events.event_type. DB CHECK 제약과 같은 값이어야 한다. */
  eventType:
    | 'base_activity'
    | 'excess_activity'
    | 'headcount_bonus'
    | 'deliverable_bonus';
  basePoints: number;
  finalPoints: number;
  weekStart: string;
  /** 사람이 읽는 근거. 정정과 소명이 가능해야 한다. */
  reason: string;
}

/** '9/15' */
function shortDate(date: string): string {
  const p = date.split('-');
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : date;
}

export function calculateScores(
  certs: ScorableCert[],
  capacity: number,
): ComputedEvent[] {
  const min = minParticipants(capacity);

  // 활동일 순서가 기준이다. 같은 날이면 먼저 올린 것이 앞선다.
  const sorted = [...certs].sort(
    (a, b) => a.activityDate.localeCompare(b.activityDate) || a.createdAt - b.createdAt,
  );

  const events: ComputedEvent[] = [];

  /* ── 주 단위: 기본 · 초과 · 인원 추가 ─────────────────── */

  const byWeek = new Map<string, ScorableCert[]>();
  for (const c of sorted) {
    const w = resolveScoringWeek(c.activityDate);
    const list = byWeek.get(w);
    if (list) list.push(c);
    else byWeek.set(w, [c]);
  }

  for (const [weekStart, week] of byWeek) {
    let baseCount = 0;
    let headcountCount = 0;
    let socialCount = 0;
    const usedDays = new Set<string>();

    for (const c of week) {
      // §6.3 기준 인원에 못 미치면 기본도 초과도 인정하지 않는다.
      // §6.4 가 초과분에도 기준 인원을 동일 적용한다고 못박았다.
      if (c.participantCount < min) continue;

      // §6.4 친목 활동은 초과분으로만 인정한다. 상한이 정해지면
      // SOCIAL_WEEKLY_LIMIT 에 넣으면 여기서 걸린다.
      if (c.isSocial) {
        if (SOCIAL_WEEKLY_LIMIT !== null && socialCount >= SOCIAL_WEEKLY_LIMIT) continue;
        socialCount += 1;
      }

      const canBase =
        !c.isSocial &&
        baseCount < SCORING.weeklyBaseLimit &&
        // §6.2 하루 인정 1회. 같은 날 두 번 만나 쌓는 것을 막는다.
        !usedDays.has(c.activityDate);

      if (canBase) {
        baseCount += 1;
        usedDays.add(c.activityDate);
        events.push({
          certificationId: c.id,
          eventType: 'base_activity',
          basePoints: SCORING.basePoints,
          finalPoints: SCORING.basePoints,
          weekStart,
          reason: `${shortDate(c.activityDate)} 활동 · ${c.participantCount}명 참여`,
        });
      } else {
        // §6.4 주 2회 초과분. 친목 활동도 여기서 인정된다.
        events.push({
          certificationId: c.id,
          eventType: 'excess_activity',
          basePoints: SCORING.excessPoints,
          finalPoints: SCORING.excessPoints,
          weekStart,
          reason: c.isSocial
            ? `${shortDate(c.activityDate)} 친목 활동`
            : `${shortDate(c.activityDate)} 추가 활동`,
        });
      }

      // §6.5 참여 인원 6명 이상이면 4점, 주 1회까지.
      if (
        c.participantCount >= SCORING.headcountThreshold &&
        headcountCount < SCORING.headcountWeeklyLimit
      ) {
        headcountCount += 1;
        events.push({
          certificationId: c.id,
          eventType: 'headcount_bonus',
          basePoints: SCORING.headcountBonus,
          finalPoints: SCORING.headcountBonus,
          weekStart,
          reason: `${c.participantCount}명 참여`,
        });
      }
    }
  }

  /* ── 전체 기간: 산출물 (§6.6) ─────────────────────────── */

  // 주 단위가 아니라 전체 기간 5회 한도다. 먼저 한 활동부터 채운다
  // — 뒤늦게 승인된 지난 활동이 앞자리를 가져가는 것이 맞다.
  // 0점(반려)은 이벤트를 만들지 않는다. 0점 행이 쌓이면 내역이
  // 길어지기만 하고 팀이 볼 것이 없다.
  let awarded = 0;
  for (const c of sorted) {
    if (awarded >= SCORING.deliverableTotalLimit) break;
    const grade = c.deliverableScore;
    if (grade === null || grade <= 0) continue;

    awarded += 1;
    events.push({
      certificationId: c.id,
      eventType: 'deliverable_bonus',
      basePoints: grade,
      finalPoints: grade,
      weekStart: resolveScoringWeek(c.activityDate),
      reason: `${shortDate(c.activityDate)} 산출물 (${awarded}/${SCORING.deliverableTotalLimit}회)`,
    });
  }

  return events;
}

/** 이벤트 합계. 화면에서 "이번 인증으로 몇 점"을 보여줄 때 쓴다. */
export function sumPoints(events: ComputedEvent[]): number {
  return events.reduce((n, e) => n + e.finalPoints, 0);
}
