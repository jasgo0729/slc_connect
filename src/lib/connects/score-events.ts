/**
 * 점수 이벤트 표기.
 *
 * score_events.event_type 은 DB의 CHECK 제약과 같은 목록이다.
 * 화면과 서버가 같은 상수를 읽어야 새 유형을 추가했을 때 한쪽만
 * 빠지는 일이 없다.
 *
 * 이 파일에 DB 드라이버를 끌어들이지 않는다 — 화면(클라이언트
 * 컴포넌트)에서도 읽으므로, 쿼리 계층에 두면 pg 가 브라우저
 * 번들로 딸려 간다. 과거에 실제로 있었던 일이다.
 */

/** DB CHECK 'score_event_type_chk' 와 같은 목록이어야 한다. */
export const SCORE_EVENT_LABELS: Record<string, string> = {
  base_activity: '활동 인증',
  excess_activity: '추가 활동',
  headcount_bonus: '전원 참여',
  deliverable_bonus: '산출물 인증',
  cross_connect: 'CCC 활동',
  exam_special: '시험 기간 특별',
  manual_adjustment: '운영진 조정',
};

/**
 * 모르는 유형은 값을 그대로 낸다.
 *
 * 임의의 라벨로 덮으면 유형을 새로 만들고 여기를 빠뜨렸을 때
 * 아무도 눈치채지 못한다. 배지(components/ui/badge.tsx)에서
 * 같은 이유로 같은 방식을 쓴다.
 */
export function scoreEventLabel(eventType: string): string {
  return SCORE_EVENT_LABELS[eventType] ?? eventType;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * '9/1 (월)'.
 *
 * 'YYYY-MM-DD' 는 날짜만 있는 값이라 new Date(문자열)로 읽으면
 * UTC 자정으로 해석되어 한국에서는 하루 전으로 보인다.
 * 숫자를 직접 쪼개 UTC로 만들어 요일만 얻는다 — 서버가 어느
 * 시간대에서 돌든 같은 결과가 나온다.
 */
export function formatActivityDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d} (${weekday})`;
}

/** '+10점' / '-5점'. 조정(감점)이 있으므로 부호를 지우지 않는다. */
export function formatPoints(points: number): string {
  return `${points > 0 ? '+' : ''}${points}점`;
}

/**
 * 랭킹의 집계 기간.
 *
 * 지금은 누적 총점이다. 시안 문구는 "이번 주"였으나 그대로 쓰지
 * 않았다 — score_events.week_start 는 활동일이 아니라 **검수
 * 시점**에 확정해 저장한다(G-18). 검수가 하루라도 밀리면 지난주
 * 활동이 이번 주 합계에 잡혀 문구가 사실과 어긋난다.
 * 점수 규칙이 확정되고 주차 귀속 방식이 정해지면 이 상수와
 * lib/db/queries/ranking.ts 의 집계 범위만 함께 바꾼다.
 */
export const RANKING_PERIOD_LABEL = '전체';
