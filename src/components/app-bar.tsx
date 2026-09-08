import Link from 'next/link';
import { Brand } from './ui/brand';
import { UserMenu } from './user-menu';
import { IconBell, IconPlus } from './ui/icon';
import { countUnread } from '@/lib/db/queries/notifications';

/**
 * 상단 바.
 *
 * 데스크탑에서는 하단 탭바가 사라지므로 개설·알림이 여기로 올라온다.
 * 모바일에서는 탭바가 그 둘을 맡으므로 상단에서 감춘다 —
 * 같은 버튼을 두 곳에 두면 어느 쪽을 눌러야 하는지 헷갈린다.
 */
const NAV = [
  { href: '/connects', label: '씨앗판' },
  { href: '/recommend', label: '추천' },
  { href: '/ranking', label: '랭킹' },
  { href: '/mbti', label: 'Connect-MBTI' },
];

export async function AppBar({
  current,
  user,
  callbackUrl,
}: {
  current?: string;
  user?: { id: string; name: string } | null;
  callbackUrl?: string;
}) {
  const unread = user ? await countUnread(user.id) : 0;

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
            <>
              <Link href="/connects/new" className="btn btn--sm desk-only">
                <IconPlus size={16} />
                커넥트 만들기
              </Link>

              <Link
                href="/notifications"
                className="bell desk-only"
                aria-label={unread > 0 ? `알림 ${unread}건` : '알림'}
              >
                <IconBell size={20} />
                {unread > 0 && <span className="bell-dot">{unread > 9 ? '9+' : unread}</span>}
              </Link>

              <UserMenu name={user.name} />
            </>
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
