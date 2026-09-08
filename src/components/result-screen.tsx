import Link from 'next/link';

/**
 * 결과 안내 화면.
 *
 * 개설 완료·승인 대기·반려·가입 완료·거절이 모두 같은 뼈대를 쓴다.
 * 아이콘 색이 결과의 성격을 먼저 알리고, 그다음 무엇을 하면 되는지를 준다.
 *
 * 버튼이 항상 있다는 게 중요하다. 결과만 알리고 끝내면 사용자가
 * 뒤로가기로 돌아가야 하고, 거절당한 사람에게는 특히 막다른 길이 된다.
 */
export type ResultTone = 'success' | 'wait' | 'reject' | 'celebrate';

const ICONS: Record<ResultTone, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  wait: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  ),
  reject: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
      <path d="M12 6.5v7M12 17.3v.2" />
    </svg>
  ),
  celebrate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20l4.5-11 6.5 6.5L4 20Z" />
      <path d="M14 9.5 15 8M17 12.5l1.8-.4M13.5 5.5 14 3.6M18.5 7.5l1.6-1.2M19 16l1.8.6" />
    </svg>
  ),
};

export function ResultScreen({
  tone,
  title,
  body,
  detail,
  children,
  actions,
}: {
  tone: ResultTone;
  title: string;
  body?: React.ReactNode;
  /** 반려·거절 사유처럼 강조해서 보여줄 내용. */
  detail?: { label: string; text: string };
  children?: React.ReactNode;
  actions: { href: string; label: string; variant?: 'primary' | 'line' }[];
}) {
  return (
    <main className="result">
      <div className="result-inner">
        <div className={`result-icon result-icon--${tone}`}>{ICONS[tone]}</div>

        <h1 className="result-title">{title}</h1>
        {body && <p className="result-body">{body}</p>}

        {detail && (
          <div className="result-detail">
            <p className="result-detail-label">{detail.label}</p>
            <p className="result-detail-text">{detail.text}</p>
          </div>
        )}

        {children}

        <div className="result-actions">
          {actions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={a.variant === 'line' ? 'btn btn--line btn--block' : 'btn btn--block'}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
