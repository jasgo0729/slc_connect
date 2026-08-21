/**
 * 자리 줄 — 이 서비스의 시그니처.
 *
 * PRISM 워드마크의 ◯◯◯◯✦ 를 그대로 가져왔다.
 * 원은 이미 찬 자리, 스파클은 비어 있는 당신 자리.
 * 로고를 인용하면서 동시에 "여기 네 자리가 있다"를 말한다.
 *
 * 스파클(골드)은 히어로와 인증 화면에서만 켠다.
 * 목록의 카드마다 켜면 포인트가 배경이 된다.
 */

function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 1.5c.55 6.2 4.3 9.95 10.5 10.5-6.2.55-9.95 4.3-10.5 10.5-.55-6.2-4.3-9.95-10.5-10.5C7.7 11.45 11.45 7.7 12 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface Props {
  /** 정원. C-03 기준 4~7. */
  capacity: number;
  /** 현재 인원. 팀장을 포함한 수라 최소 1이다. */
  taken: number;
  /** 빈 자리 첫 칸을 스파클로 표시할지. */
  highlightOpen?: boolean;
  /** 로드 시 순서대로 나타나는 연출. */
  stagger?: boolean;
  size?: 'sm' | 'md';
}

export function Seats({
  capacity,
  taken,
  highlightOpen = false,
  stagger = false,
  size = 'md',
}: Props) {
  const open = capacity - taken;

  return (
    <div
      className={`seats seats--${size}`}
      role="img"
      aria-label={`정원 ${capacity}명 중 ${taken}명 참여, ${open}자리 남음`}
    >
      {Array.from({ length: capacity }, (_, i) => {
        const delay = stagger ? { animationDelay: `${0.15 + i * 0.07}s` } : undefined;

        if (highlightOpen && i === taken) {
          return <Sparkle key={i} className="seat-star" />;
        }
        return (
          <span
            key={i}
            className={`seat seat--${i < taken ? 'taken' : 'open'}`}
            style={delay}
          />
        );
      })}
    </div>
  );
}
