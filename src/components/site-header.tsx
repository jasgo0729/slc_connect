import Link from 'next/link';

/**
 * 사이트 헤더.
 *
 * 스스로 바(bar)를 그린다. 아래쪽 실선이 없으면 히어로 안에 떠 있는
 * 글자처럼 보이고, 오른쪽 끝의 링크가 본문과 아무 관계 없이
 * 홀로 떨어져 보인다.
 */
export function SiteHeader({
  action = 'login',
  callbackUrl,
  tone = 'light',
}: {
  action?: 'login' | 'me' | 'none';
  callbackUrl?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <div className={`head-bar head-bar--${tone}`}>
      <div className="shell site-head">
        <Link href="/" className="wordmark">
          Cross-SLC
          <svg
            className="wordmark-star"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 1.5c.55 6.2 4.3 9.95 10.5 10.5-6.2.55-9.95 4.3-10.5 10.5-.55-6.2-4.3-9.95-10.5-10.5C7.7 11.45 11.45 7.7 12 1.5Z" />
          </svg>
          Connect
        </Link>

        {action === 'login' && (
          <Link
            href={
              callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login'
            }
            className="head-cta"
          >
            로그인
          </Link>
        )}
        {action === 'me' && (
          <Link href="/me" className="head-cta">
            내 신청 현황
          </Link>
        )}
      </div>
    </div>
  );
}
