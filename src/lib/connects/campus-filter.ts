/**
 * 캠퍼스 필터 판정.
 *
 * '공통' 커넥트는 양 캠퍼스 모두에서 활동하므로 인사캠 필터에도,
 * 자과캠 필터에도 나와야 한다. 정확히 일치만 보면 공통 커넥트가
 * 어느 필터에서도 보이지 않아 사실상 사라진다.
 *
 * 반대로 '공통'을 고른 사람은 양쪽 다 되는 커넥트를 찾는 것이므로
 * 공통만 남긴다.
 */
export const CAMPUS_BOTH = '공통';

export function matchesCampus(connectCampus: string, filter: string | undefined): boolean {
  if (!filter) return true;
  if (filter === CAMPUS_BOTH) return connectCampus === CAMPUS_BOTH;
  return connectCampus === filter || connectCampus === CAMPUS_BOTH;
}
