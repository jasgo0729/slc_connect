/**
 * 취미 트랙 점수 규칙 — 규칙서 §6.2 ~ §6.6.
 *
 * 숫자를 계산 코드에 흩어 두지 않고 여기 모은다. 규칙이 바뀔 때
 * 고칠 곳이 한 군데여야 하고, 무엇보다 "지금 몇 점인가"를 코드를
 * 읽지 않고 확인할 수 있어야 한다.
 *
 * 화면에서도 읽으므로 DB 드라이버를 부르지 않는다.
 */

export const SCORING = {
  /** §6.2 만남 1회당 */
  basePoints: 10,
  /** §6.2 주간 인정 횟수 */
  weeklyBaseLimit: 2,
  /** §6.2 하루 인정 횟수 */
  dailyBaseLimit: 1,

  /** §6.4 주 2회를 넘긴 활동의 회당 점수 */
  excessPoints: 2,

  /** §6.5 참여 인원이 이 수 이상이면 */
  headcountThreshold: 6,
  /** §6.5 인원 추가점 */
  headcountBonus: 4,
  /** §6.5 주 1회까지 */
  headcountWeeklyLimit: 1,

  /** §6.6 산출물 등급. 0점은 반려이므로 이벤트를 만들지 않는다. */
  deliverableGrades: [0, 5, 10, 15] as const,
  /** §6.6 전체 활동 기간 중 최대 인정 횟수 */
  deliverableTotalLimit: 5,
} as const;

/** §6.6 등급 설명. 검수 화면과 판정 기준이 같은 문구를 읽는다. */
export const DELIVERABLE_GRADES = [
  { value: 0, label: '반려', hint: '산출물로 보기 어려움' },
  { value: 5, label: '5점', hint: '형식적으로 올림' },
  { value: 10, label: '10점', hint: '열심히 함' },
  { value: 15, label: '15점', hint: '누가 봐도 고퀄리티' },
] as const;

export function isDeliverableGrade(v: number): boolean {
  return (SCORING.deliverableGrades as readonly number[]).includes(v);
}

/**
 * §6.3 기본 점수를 인정하는 최소 참석 인원.
 *
 *   정원 4~5명 → 3명 이상
 *   정원 6~7명 → 4명 이상
 *
 * 정원은 DB 제약상 4~7 이지만(connects_capacity_chk), 그 밖의
 * 값이 들어와도 계산이 멈추지 않도록 경계를 열어 둔다. 정원이
 * 늘어나면 규칙서를 고치고 여기를 함께 고쳐야 한다.
 */
export function minParticipants(capacity: number): number {
  return capacity >= 6 ? 4 : 3;
}

/**
 * §6.4 친목 활동(주제 무관)의 주간 횟수 상한.
 *
 * 규칙서에 [미확정]으로 남아 있다. null 은 상한 없음이다.
 * 정해지면 숫자를 넣으면 되고, 계산 코드는 이미 이 값을 본다.
 */
export const SOCIAL_WEEKLY_LIMIT: number | null = null;

/**
 * §7.7 크로스 커넥트 챌린지(CCC).
 *
 * 취미 트랙(§6)과 별개의 규칙이다. 기본 10점도, 주 2회 한도도,
 * 기준 인원(§6.3)도, 인원 추가점(§6.5)도 적용되지 않는다.
 * 두 규칙을 섞으면 같은 활동이 양쪽 한도를 동시에 먹는다.
 *
 * 성립 요건은 "양 팀 합산" 이지만 배점은 "자기 팀 인원" 이다.
 * A 3명 · B 2명이면 합산 5명으로 성립하고, A 는 15점 B 는 10점을
 * 받는다. 한쪽만 많이 와도 상대가 적으면 성립하지 않는다.
 */
export const CROSS = {
  /** 양 팀 합산 최소 인원. 미달이면 점수가 없다. */
  minTotalParticipants: 5,
  /** 자기 팀 참석 인원 1명당. */
  pointsPerMember: 5,
  /** 한 팀이 CCC 로 한 주에 얻을 수 있는 최대 점수. */
  weeklyLimit: 20,
} as const;

/**
 * §9.3 도전 트랙 정량 평가 · 활동 횟수 (20%).
 *
 * 도전 트랙은 점수제가 아니다. 정량 40% · 정성 60% 로 평가하고,
 * 그중 웹사이트가 셀 수 있는 것은 활동 횟수 20% 하나다. 성실성
 * (계획서 이행률·보고서 기한)과 학교 평가·구성원 투표는 카페
 * 문서와 2월 투표에서 나온다.
 *
 * "정량 평가로 변별이 되지 않도록 널널한 기준을 적용한다"(§9.3).
 * 그래서 §6.3 기준 인원 같은 문턱을 두지 않는다.
 */
export const CHALLENGE = {
  /** 총 활동 목표. 이 횟수 이상이면 만점. */
  totalTarget: 8,
  /** 그중 오프라인 최소 횟수. */
  offlineTarget: 4,
  /** 이 항목의 만점(%). */
  maxPercent: 20,
  /** 미달 1회당 감점(%). */
  penaltyPerMissing: 2,
} as const;

/**
 * 수동 정정의 한 번 한도.
 *
 * 규칙서에 없는 값이다. 오타를 막으려고 둔다 — 10을 넣으려다
 * 100을 넣으면 한 팀의 순위가 통째로 뒤집히고, 랭킹은 매주
 * 공개되므로(§6.12) 그 사이에 학생들이 먼저 본다.
 *
 * 이 범위를 넘는 정정이 필요하면 여러 번 나눠 넣는다. 나눠 넣으면
 * 각각에 근거가 남아 나중에 무엇을 왜 줬는지 읽을 수 있다.
 */
export const MANUAL_ADJUSTMENT_LIMIT = 100;

/** 정정 사유는 반드시 적는다. 근거 없는 점수는 소명할 수 없다. */
export const MANUAL_REASON_MIN = 2;
export const MANUAL_REASON_MAX = 200;
