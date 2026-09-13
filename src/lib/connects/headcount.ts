/**
 * 인원 표기.
 *
 * 숫자를 그대로 보여주면 0/6, 1/6이 "아무도 안 가는 팀"으로 읽힌다.
 * 모집 초반에는 대부분이 그 상태인데, 그걸 본 사람이 신청을 미루면
 * 실제로 미달이 되어 예측이 스스로를 맞춘다.
 *
 * 그래서 최소 인원(4명)에 닿기 전까지는 숫자 대신 상태를 말한다.
 *
 *   0~2명   인원 모집 중!
 *   3명     활동 개시까지 1명
 *   4명~    4/6  (숫자를 그대로)
 *
 * 4명부터 숫자를 쓰는 이유는, 그때부터는 "자리가 얼마나 남았나"가
 * 궁금해지기 때문이다. 그 전까지는 자리보다 결성 여부가 관심사다.
 */
export const MIN_MEMBERS = 4;

export interface Headcount {
  text: string;
  /** 결성에 필요한 인원이 남아 곧 채워질 수 있는 상태. */
  urgent: boolean;
  /** 숫자를 그대로 쓰는 구간. */
  numeric: boolean;
}

export function headcount(memberCount: number, capacity: number): Headcount {
  if (memberCount >= MIN_MEMBERS) {
    return { text: `${memberCount}/${capacity}`, urgent: false, numeric: true };
  }

  const left = MIN_MEMBERS - memberCount;
  if (left === 1) {
    return { text: '활동 개시까지 1명', urgent: true, numeric: false };
  }

  return { text: '인원 모집 중!', urgent: false, numeric: false };
}
