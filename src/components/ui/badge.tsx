/**
 * B-08 모집 상태 배지.
 *
 * 문구는 참여자가 무엇을 할 수 있는지로 쓴다.
 * "조기 마감"보다 "승인받고 참여"가 다음 행동을 알려준다.
 */
const STATUS: Record<string, { text: string; tone: string }> = {
  recruiting: { text: '모집 중', tone: 'open' },
  full_closed: { text: '마감', tone: 'closed' },
  // 목록에서는 상태를 그대로 알린다. '승인받고 참여'는 무엇을 해야
  // 하는지는 알려주지만 왜 그런지를 감춘다. 상세 화면의 버튼에서
  // '승인받고 참여하기'로 안내하는 것으로 충분하다.
  early_closed: { text: '조기 마감', tone: 'review' },
  pending_review: { text: '도전 확인 대기', tone: 'review' },
  // 0004 에서 추가한 상태. 여기 빠져 있어서 반려된 커넥트가
  // '모집 중'으로 보였다.
  rejected: { text: '반려됨', tone: 'danger' },
  confirmed: { text: '활동 중', tone: 'closed' },
  private: { text: '비공개', tone: 'closed' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status];

  // 모르는 상태를 '모집 중'으로 보여주면 신청할 수 없는 커넥트가
  // 신청할 수 있는 것처럼 읽힌다. 상태를 새로 추가하고 여기를
  // 빠뜨렸을 때 눈에 띄도록 값을 그대로 낸다.
  if (!s) return <span className="badge badge--neutral">{status}</span>;

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
