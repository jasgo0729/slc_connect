import Link from 'next/link';
import { IconBell, IconCompass, IconHome, IconPlus, IconUser } from './ui/icon';

/**
 * 하단 탭바 — 모바일 전용(900px 미만).
 *
 * 가운데 개설 버튼은 띄워 둔다. 개설이 이 서비스에서 가장 만들기 어려운
 * 행동이라, 목록 어디에서나 한 번에 닿아야 한다.
 */
const TABS = [
  { href: '/connects', label: '홈', icon: IconHome },
  { href: '/recommend', label: '추천', icon: IconCompass },
  { href: '/connects/new', label: '개설', icon: IconPlus, fab: true },
  { href: '/me', label: '마이', icon: IconUser },
  { href: '/notifications', label: '알림', icon: IconBell },
];

export function TabBar({ current }: { current?: string }) {
  return (
    <nav className="tabbar" aria-label="하단 메뉴">
      {TABS.map(({ href, label, icon: Icon, fab }) =>
        fab ? (
          <Link key={href} href={href} className="tab-fab">
            <span className="tab-fab-btn" aria-hidden="true">
              <Icon size={22} />
            </span>
            <span>{label}</span>
          </Link>
        ) : (
          <Link key={href} href={href} aria-current={current === href ? 'page' : undefined}>
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
