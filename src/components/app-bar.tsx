import Link from 'next/link';
import { Brand } from './ui/brand';
import { UserMenu } from './user-menu';

/**
 * 상단 바.
 *
 * 데스크탑에서는 여기에 주요 이동이 전부 들어간다(.topnav).
 * 모바일에서는 이 부분이 숨고 하단 탭바가 대신한다.
 * 두 벌이 아니라 같은 목록을 화면 폭에 따라 다른 자리에 놓는 구조다.
 */
const NAV = [
  { href: '/connects', label: '씨앗판' },
  { href: '/recommend', label: '추천' },
  { href: '/ranking', label: '랭킹' },
  { href: '/mbti', label: 'Connect-MBTI' },
];

export function AppBar({
  current,
  user,
  callbackUrl,
}: {
  current?: string;
  user?: { name: string } | null;
  callbackUrl?: string;
}) {
  return (
    <header className="appbar">
      <div className="shell appbar-inner">
        <Brand />

        <nav className="topnav" aria-label="주요 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current === n.href ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="appbar-right">
          {user ? (
            <UserMenu name={user.name} />
          ) : (
            <Link
              href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login'}
              className="btn btn--sm"
            >
              로그인하기
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
