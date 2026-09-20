import { CROSS, SCORING, SOCIAL_WEEKLY_LIMIT, minParticipants } from './rules';
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
  /**
   * CCC 활동이면 함께한 상대 팀 이름.
   *
   * 점수 계산에는 쓰지 않는다 — CCC 도 그 팀에게는 그냥 활동
   * 한 번이고, §6.2 의 주 2회를 함께 쓴다. 근거 문구에만 넣는다.
   * 내역에 "9/21 활동"만 있으면 팀이 무엇으로 받은 점수인지
   * 알 수 없다.
   */
  crossWith?: string | null;

  /**
   * §7.7 크로스 커넥트 챌린지.
   *
   * true 면 취미 트랙 규칙(§6)을 통째로 건너뛴다. 기본 점수도,
   * 주 2회 한도도, 기준 인원도, 인원 추가점도, 산출물도 적용되지
   * 않는다. CCC 는 §7.7 의 자기 몫 계산만 받는다.
   */
  isCross?: boolean;

  /** CCC 에서 상대 팀 참석 인원. 성립 요건(합산 5명) 판정에 쓴다. */
  partnerCount?: number;
}

export interface ComputedEvent {
  certificationId: string;
  /** score_events.event_type. DB CHECK 제약과 같은 값이어야 한다. */
  eventType:
    | 'base_activity'
    | 'excess_activity'
    | 'headcount_bonus'
    | 'deliverable_bonus'
    | 'cross_connect';
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

function activityReason(c: ScorableCert): string {
  const head = c.crossWith
    ? `${shortDate(c.activityDate)} ${c.crossWith}와 함께`
    : `${shortDate(c.activityDate)} 활동`;
  return `${head} · ${c.participantCount}명 참여`;
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

  /* CCC 는 여기서 완전히 갈라진다(§7.7).
     같은 목록에 두면 CCC 한 번이 §6.2 의 주 2회 중 한 자리를
     차지해 버린다. 두 규칙은 서로의 한도를 건드리지 않는다. */
  const crossCerts = sorted.filter((c) => c.isCross);
  const hobbyCerts = sorted.filter((c) => !c.isCross);

  /* ── 주 단위: 기본 · 초과 · 인원 추가 (§6, 취미 트랙) ─── */

  const byWeek = new Map<string, ScorableCert[]>();
  for (const c of hobbyCerts) {
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
          reason: activityReason(c),
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
            : c.crossWith
              ? `${shortDate(c.activityDate)} ${c.crossWith}와 함께 (추가)`
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
  for (const c of hobbyCerts) {
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

  /* ── 크로스 커넥트 챌린지 (§7.7) ──────────────────────── */

  const crossByWeek = new Map<string, ScorableCert[]>();
  for (const c of crossCerts) {
    const w = resolveScoringWeek(c.activityDate);
    const list = crossByWeek.get(w);
    if (list) list.push(c);
    else crossByWeek.set(w, [c]);
  }

  for (const [weekStart, week] of crossByWeek) {
    // 주간 상한 20점. 먼저 한 활동부터 채운다.
    let left = CROSS.weeklyLimit;

    for (const c of week) {
      if (left <= 0) break;

      // 첫 만남 특례 미적용(§7.7). 주제와 무관한 CCC 는 인정하지
      // 않는다 — 멤버를 조금씩 바꾸면 매번 첫 만남이 되어 판정이
      // 불가능하다는 것이 규칙서의 이유다.
      if (c.isSocial) continue;

      // 성립 요건: 양 팀 합산 5명 이상.
      const total = c.participantCount + (c.partnerCount ?? 0);
      if (total < CROSS.minTotalParticipants) continue;

      // 배점: 자기 팀 인원 1명당 5점.
      const full = c.participantCount * CROSS.pointsPerMember;
      const points = Math.min(full, left);
      if (points <= 0) continue;
      left -= points;

      const who = c.crossWith ? `${c.crossWith}와 함께` : 'CCC 활동';
      events.push({
        certificationId: c.id,
        eventType: 'cross_connect',
        basePoints: full,
        finalPoints: points,
        weekStart,
        // 깎였으면 그 사실을 남긴다. 아니면 왜 15점이 아니라 5점인지
        // 팀이 알 수 없다.
        reason:
          points < full
            ? `${shortDate(c.activityDate)} ${who} · ${c.participantCount}명 참여 (주간 상한 ${CROSS.weeklyLimit}점)`
            : `${shortDate(c.activityDate)} ${who} · ${c.participantCount}명 참여`,
      });
    }
  }

  return events;
}

/** 이벤트 합계. 화면에서 "이번 인증으로 몇 점"을 보여줄 때 쓴다. */
export function sumPoints(events: ComputedEvent[]): number {
  return events.reduce((n, e) => n + e.finalPoints, 0);
}
