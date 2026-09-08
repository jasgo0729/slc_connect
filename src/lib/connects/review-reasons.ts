/**
 * J-05 개설 반려 사유.
 *
 * 화면과 서버 검증이 같은 목록을 읽어야 하므로 쿼리 파일이 아니라
 * 여기 둔다. 쿼리 파일에 두면 DB 드라이버가 브라우저 번들에 딸려 온다.
 *
 * 개설자가 무엇을 고쳐야 하는지 바로 알 수 있게 쓴다.
 * "부적합"만으로는 다시 신청할 수 없다.
 */
export const REVIEW_REJECT_REASONS = [
  {
    value: 'hobby',
    label: '취미 성격의 주제예요',
    text: '취미 성격의 주제입니다. 취미 트랙으로 다시 만들거나, 학기 말에 남길 결과물을 정해 주세요.',
  },
  {
    value: 'vague',
    label: '목표가 구체적이지 않아요',
    text: '무엇을 완성할지가 분명하지 않습니다. 결과물의 형태와 범위를 적어 주세요.',
  },
  {
    value: 'deadline',
    label: '목표 시점이 시즌을 벗어나요',
    text: '목표 시점이 산출물 마감 이후입니다. 시즌 안에 끝낼 수 있는 범위로 조정해 주세요.',
  },
  {
    value: 'scope',
    label: '4~7명이 하기엔 범위가 커요',
    text: '한 학기에 4~7명이 해내기 어려운 범위입니다. 목표를 나누거나 좁혀 주세요.',
  },
  {
    value: 'duplicate',
    label: '비슷한 커넥트가 이미 있어요',
    text: '같은 주제의 커넥트가 이미 있습니다. 기존 커넥트에 참여하거나 주제를 달리해 주세요.',
  },
] as const;

export function reviewRejectText(value: string): string {
  return (
    REVIEW_REJECT_REASONS.find((r) => r.value === value)?.text ??
    '내용을 확인한 뒤 다시 신청해 주세요.'
  );
}

export function isReviewReason(v: string): boolean {
  return REVIEW_REJECT_REASONS.some((r) => r.value === v);
}
