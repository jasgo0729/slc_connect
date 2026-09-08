import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * 관리자 영역.
 *
 * A-08 — 점수 입력과 랭킹 조작이 가능한 화면이라 별도로 막는다.
 * proxy.ts의 matcher와 별개로 여기서 다시 확인한다. matcher를
 * 한 줄 잘못 고쳐도 이 레이아웃이 남아 있으면 뚫리지 않는다.
 *
 * 관리자 승격은 화면으로 만들지 않는다. DB에서 role을 직접 바꾼다.
 * 승격 화면을 두면 그 화면 자체가 공격면이 된다.
 */
const NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/connects', label: '도전 확인' },
  { href: '/admin/connects/all', label: '커넥트' },
  { href: '/admin/members', label: '인원' },
  { href: '/admin/notify', label: '공지' },
  { href: '/admin/confirm', label: '팀 확정' },
  { href: '/admin/season', label: '시즌 설정' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=%2Fadmin');
  if (user.role !== 'admin') redirect('/connects');

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="shell admin-bar-inner">
          <Link href="/admin" className="admin-brand">
            운영
          </Link>
          <nav className="admin-nav">
            {NAV.slice(1).map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/connects" className="admin-out">
            서비스로
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
