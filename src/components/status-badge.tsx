/**
 * B-08 모집 상태 표시.
 *
 * 공개 목록에 실제로 나타나는 것은 네 가지뿐이다.
 * pending_review(정성 확인 대기)와 private(비공개)은 목록에 오르지 않는다.
 *
 * 문구는 참여자가 무엇을 할 수 있는지로 쓴다.
 * "조기 마감"보다 "승인받고 참여"가 다음 행동을 알려준다.
 */
const LABEL: Record<string, { text: string; tone: string }> = {
  recruiting: { text: '모집 중', tone: 'open' },
  full_closed: { text: '자리 찼음', tone: 'closed' },
  early_closed: { text: '승인받고 참여', tone: 'review' },
  confirmed: { text: '활동 중', tone: 'closed' },
  pending_review: { text: '확인 대기', tone: 'review' },
  private: { text: '비공개', tone: 'closed' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = LABEL[status] ?? LABEL.recruiting!;
  return <span className={`badge badge--${s.tone}`}>{s.text}</span>;
}
