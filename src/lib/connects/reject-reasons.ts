/**
 * D-03 거절 정형 문구.
 *
 * 화면(클라이언트)과 서버 검증이 같은 목록을 읽어야 하므로
 * 쿼리 파일이 아니라 여기 둔다. 쿼리 파일에 두면 DB 드라이버가
 * 브라우저 번들로 딸려 들어간다.
 *
 * 팀장이 거절 문장을 직접 쓰지 않아도 되게 하려는 장치다.
 * 아는 사이에서 거절 이유를 적는 일은 부담이 크고,
 * 그 부담 때문에 신청을 방치하면 신청자가 더 오래 기다린다.
 */
export const REJECT_REASONS = [
  { value: 'capacity', label: '이미 인원이 거의 찼어요' },
  { value: 'schedule', label: '활동 요일이 맞지 않아요' },
  { value: 'campus', label: '활동 캠퍼스가 달라요' },
  { value: 'goal', label: '팀 목표와 방향이 조금 달라요' },
  { value: 'role', label: '기획 중인 프로젝트의 역할 배분이 모두 완료되었어요' },
  { value: 'etc', label: '이번에는 함께하기 어려울 것 같아요' },
] as const;

export function rejectLabel(value: string | null): string {
  return REJECT_REASONS.find((r) => r.value === value)?.label ?? REJECT_REASONS[REJECT_REASONS.length - 1].label;
}

export function isRejectReason(v: string): boolean {
  return REJECT_REASONS.some((r) => r.value === v);
}
