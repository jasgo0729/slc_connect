'use client';

import Link from 'next/link';
import { StatusBadge, Badge } from './ui/badge';
import { FavoriteButton } from './favorite-button';
import { trackLabel } from '@/lib/connects/options';
import { headcount } from '@/lib/connects/headcount';

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

/**
 * 캠퍼스를 테두리 색으로 구분한다.
 *
 * 배지를 읽지 않아도 어느 캠퍼스인지 훑어보며 알 수 있다.
 * 같은 주제가 양 캠퍼스에 각각 열려 있어서, 목록에서 이 둘을
 * 가려내는 일이 자주 생긴다.
 */
const CAMPUS_CLASS: Record<string, string> = {
  인문사회: 'humanities',
  자연과학: 'science',
  공통: 'both',
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
  const head = headcount(c.memberCount, c.capacity);

  return (
    <article className={`ccard ccard--${CAMPUS_CLASS[c.campus] ?? "both"}`}>
      <h3 className="ccard-name">
        <Link href={`/connects/${c.id}`} className="ccard-link">
          {c.name}
        </Link>
      </h3>
      <p className="ccard-desc">{c.tagline}</p>

      <div className="ccard-foot">
        <StatusBadge status={c.status} />
        {/* 4명 전까지는 숫자 대신 상태를 말한다. 0/6은 아무도 안 가는
            팀으로 읽혀서, 그걸 본 사람이 미루면 실제로 미달이 된다. */}
        <span className="ccard-count" data-urgent={head.urgent} data-plain={!head.numeric}>
          {head.numeric ? (
            <>
              <b>{c.memberCount}</b>/{c.capacity}
            </>
          ) : (
            head.text
          )}
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
