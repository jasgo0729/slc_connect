'use client';

import Link from 'next/link';
import { StatusBadge, Badge } from './ui/badge';
import { IconHeart } from './ui/icon';

/**
 * 커넥트 카드.
 *
 * 비로그인에게도 보이므로 참여자 이름을 담지 않는다.
 * All-04 기준으로 카드에는 인원 수까지, 이름·기수·SLC는 상세부터다.
 *
 * 인원은 팀장을 포함한 수다. 모집 초반에는 모든 카드가 1/6에서 시작한다.
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
  /** B-06 인기순 정렬용. 화면에는 노출하지 않는다(U-06: 정확한 수는 개설자만). */
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
  onFavorite,
}: {
  c: ConnectCardData;
  favorited?: boolean;
  onFavorite?: (id: string) => void;
}) {
  return (
    <Link href={`/connects/${c.id}`} className="ccard">
      <h3 className="ccard-name">{c.name}</h3>
      <p className="ccard-desc">{c.tagline}</p>

      <div className="ccard-foot">
        <StatusBadge status={c.status} />
        <span className="ccard-count">
          <b>{c.memberCount}</b>/{c.capacity}
        </span>
        <Badge>{CAMPUS_SHORT[c.campus] ?? c.campus}</Badge>
      </div>

      <button
        type="button"
        className="fav"
        aria-pressed={favorited}
        aria-label={favorited ? '찜 해제' : '찜하기'}
        onClick={(e) => {
          // 카드 전체가 링크이므로 찜은 이동을 막아야 한다.
          e.preventDefault();
          e.stopPropagation();
          onFavorite?.(c.id);
        }}
      >
        <IconHeart filled={favorited} />
      </button>
    </Link>
  );
}
