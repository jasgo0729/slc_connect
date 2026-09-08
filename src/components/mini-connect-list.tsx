import Link from 'next/link';
import { StatusBadge } from './ui/badge';
import type { MyConnect } from '@/lib/db/queries/me';

/**
 * 마이페이지용 커넥트 줄 목록.
 *
 * 씨앗판 카드보다 얇다. 여기서는 고르는 게 아니라 확인하는 것이므로
 * 설명을 한 줄로 줄이고 상태와 인원만 남긴다.
 */
const APPLICATION_LABEL: Record<string, string> = {
  pending: '승인 대기',
  rejected: '거절됨',
};

export function MiniConnectList({
  items,
  empty,
}: {
  items: MyConnect[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="mini-empty">{empty}</p>;
  }

  return (
    <ul className="mini-list">
      {items.map((c) => (
        <li key={`${c.id}-${c.myApplication ?? c.myRole ?? ''}`}>
          <Link href={`/connects/${c.id}`} className="mini-row">
            <div className="mini-main">
              <p className="mini-name">
                {c.name}
                {c.myRole === 'leader' && <span className="mini-tag">팀장</span>}
              </p>
              <p className="mini-desc">{c.tagline}</p>
            </div>
            <div className="mini-side">
              {c.myApplication ? (
                <span className={`badge badge--${c.myApplication === 'rejected' ? 'closed' : 'review'}`}>
                  {APPLICATION_LABEL[c.myApplication] ?? c.myApplication}
                </span>
              ) : (
                <StatusBadge status={c.status} />
              )}
              <span className="mini-count">
                {c.memberCount}/{c.capacity}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
