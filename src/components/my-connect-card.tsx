import Link from 'next/link';
import { StatusBadge, Badge } from './ui/badge';
import { IconHeart } from './ui/icon';
import { trackLabel } from '@/lib/connects/options';
import type { MyConnect } from '@/lib/db/queries/me';

/**
 * 마이페이지용 커넥트 카드.
 *
 * 씨앗판 카드와 같은 생김새를 쓴다. 같은 것을 다른 모양으로 보여주면
 * 목록에서 본 것과 여기 있는 것이 같은 커넥트인지 매번 확인하게 된다.
 *
 * 신청 목록에서는 커넥트 상태 대신 내 상태를 앞세운다.
 * "모집 중"보다 "승인 대기중"이 이 화면에서 알고 싶은 것이다.
 */
const MY_STATUS: Record<string, { text: string; tone: 'open' | 'review' }> = {
  approved: { text: '참여중', tone: 'open' },
  pending: { text: '승인 대기중', tone: 'review' },
};

export function MyConnectCard({
  c,
  variant,
}: {
  c: MyConnect;
  variant: 'favorite' | 'applied';
}) {
  const my = c.myApplication ? MY_STATUS[c.myApplication] : undefined;

  return (
    <article className="ccard">
      <h3 className="ccard-name">
        <Link href={`/connects/${c.id}`} className="ccard-link">
          {c.name}
        </Link>
      </h3>
      <p className="ccard-desc">
        {variant === 'applied' && c.myApplication === 'pending' && c.hasMessage
          ? '지원서 제출완료 · 승인 대기중'
          : c.tagline}
      </p>

      <div className="ccard-foot">
        {my ? (
          <>
            <span className={`badge badge--${my.tone}`}>{my.text}</span>
            {c.myApplication === 'approved' && <span className="ccard-count">소속 확정</span>}
          </>
        ) : (
          <>
            <StatusBadge status={c.status} />
            <span className="ccard-count">
              <b>{c.memberCount}</b>/{c.capacity}
            </span>
          </>
        )}
        <Badge tone="track">{trackLabel(c.track)}</Badge>
      </div>

      {variant === 'favorite' && (
        <span className="fav fav--static" aria-hidden="true">
          <IconHeart filled />
        </span>
      )}
    </article>
  );
}
