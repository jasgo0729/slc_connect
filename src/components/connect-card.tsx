'use client';

import Link from 'next/link';
import { StatusBadge, Badge } from './ui/badge';
import { FavoriteButton } from './favorite-button';
import { trackLabel } from '@/lib/connects/options';

/**
 * 커넥트 카드.
 *
 * 비로그인에게도 보이므로 참여자 이름을 담지 않는다.
 * All-04 기준으로 카드에는 인원 수까지, 이름·기수·SLC는 상세부터다.
 *
 * 카드 전체가 링크지만 <a> 안에 <button>을 넣지 않는다. 중첩된 조작
 * 요소는 HTML 규칙 위반이고, 스크린 리더에서 찜 버튼이 링크의 일부로
 * 읽힌다. 대신 제목만 링크로 두고 그 링크를 카드 전체로 늘린다.
 */
export interface ConnectCardData {
  id: string;
  name: string;
  tagline: string;
  track: string;
  campus: string;
  status: string;
  capacity: number;
  memberCount: number;
  favoriteCount: number;
  createdAt: string;
}

const CAMPUS_SHORT: Record<string, string> = {
  인문사회: '인사캠',
  자연과학: '자과캠',
  공통: '공통',
};

export function ConnectCard({
  c,
  favorited = false,
  loggedIn = false,
  onBlocked,
}: {
  c: ConnectCardData;
  favorited?: boolean;
  loggedIn?: boolean;
  onBlocked?: () => void;
}) {
  return (
    <article className="ccard">
      <h3 className="ccard-name">
        <Link href={`/connects/${c.id}`} className="ccard-link">
          {c.name}
        </Link>
      </h3>
      <p className="ccard-desc">{c.tagline}</p>

      <div className="ccard-foot">
        <StatusBadge status={c.status} />
        <span className="ccard-count">
          <b>{c.memberCount}</b>/{c.capacity}
        </span>
        <Badge>{CAMPUS_SHORT[c.campus] ?? c.campus}</Badge>
        <Badge tone="track">{trackLabel(c.track)}</Badge>
      </div>

      <FavoriteButton
        connectId={c.id}
        initial={favorited}
        loggedIn={loggedIn}
        onBlocked={onBlocked}
      />
    </article>
  );
}
