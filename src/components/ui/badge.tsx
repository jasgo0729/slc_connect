/**
 * B-08 모집 상태 배지.
 *
 * 문구는 참여자가 무엇을 할 수 있는지로 쓴다.
 * "조기 마감"보다 "승인받고 참여"가 다음 행동을 알려준다.
 */
const STATUS: Record<string, { text: string; tone: string }> = {
  recruiting: { text: '모집 중', tone: 'open' },
  full_closed: { text: '마감', tone: 'closed' },
  early_closed: { text: '승인받고 참여', tone: 'review' },
  pending_review: { text: '정성 확인 대기', tone: 'review' },
  confirmed: { text: '활동 중', tone: 'closed' },
  private: { text: '비공개', tone: 'closed' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.recruiting!;
  return <span className={`badge badge--${s.tone}`}>{s.text}</span>;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'track' | 'open' | 'review' | 'closed';
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
