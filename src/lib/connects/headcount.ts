/**
 * 인원 표기.
 *
 * 숫자는 언제나 보여준다. 몇 명인지가 신청 여부를 정하는 가장 큰
 * 정보인데 그걸 가리면 상세를 열어야만 알 수 있다.
 *
 * 다만 숫자만 두면 0/6, 1/6이 "아무도 안 가는 팀"으로 읽힌다.
 * 모집 초반에는 대부분이 그 상태이고, 그걸 본 사람이 미루면
 * 실제로 미달이 되어 예측이 스스로를 맞춘다.
 * 그래서 4명에 닿기 전까지는 짧은 말을 덧붙인다.
 *
 *   0~2명   2/6 · 모집 중
 *   3명     3/6 · 1명 더!
 *   4명~    4/6
 *
 * 4명부터 덧붙이지 않는 이유는, 그때부터 관심사가 결성 여부에서
 * "자리가 얼마나 남았나"로 옮겨 가기 때문이다.
 */
export const MIN_MEMBERS = 4;

export interface Headcount {
  memberCount: number;
  capacity: number;
  /** 숫자 뒤에 붙는 짧은 말. 4명부터는 없다. */
  suffix: string | null;
  /** 한 명만 더 오면 결성되는 상태. 눈에 띄게 한다. */
  urgent: boolean;
}

export function headcount(memberCount: number, capacity: number): Headcount {
  const base = { memberCount, capacity };

  if (memberCount >= MIN_MEMBERS) {
    return { ...base, suffix: null, urgent: false };
  }

  const left = MIN_MEMBERS - memberCount;
  if (left === 1) {
    return { ...base, suffix: '1명 더!', urgent: true };
  }

  return { ...base, suffix: '모집 중', urgent: false };
}
