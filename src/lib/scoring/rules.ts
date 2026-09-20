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
