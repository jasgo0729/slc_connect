'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConnectCard } from '@/components/connect-card';
import type { ConnectCardData } from '@/components/connect-card';
import { EmptyState } from '@/components/empty-state';
import { LoginPrompt } from '@/components/login-prompt';
import {
  CAMPUS_OPTS,
  FilterSheet,
  SORT_OPTS,
  STATUS_OPTS,
  SortSheet,
} from '@/components/filter-sheet';
import type { Filters } from '@/components/filter-sheet';
import { IconArrowRight, IconFilter } from '@/components/ui/icon';
import { matchesCampus } from '@/lib/connects/campus-filter';

/**
 * 히어로에 필요한 것만.
 *
 * lib/db/queries/ranking.ts 의 타입을 가져오지 않는다. 이 파일은
 * 클라이언트 컴포넌트라, 그 모듈을 참조하면 pg 가 브라우저 번들로
 * 딸려 갈 여지가 생긴다(규칙 12). 필드 네 개라 여기 적는 편이 싸다.
 */
export interface HeroRank {
  connectId: string;
  name: string;
  /** 부분 공개 구간에서는 null. */
  rank: number | null;
  points: number | null;
}

export interface HeroProps {
  /**
   * 모집이 끝났고 인증할 커넥트가 있을 때의 주소. 그 외에는 null
   * 이고, 그때 왼쪽 카드는 MBTI 로 남는다.
   */
  certifyHref: string | null;
  /** 상위 3팀. 비어 있으면 랭킹 카드를 띄우지 않는다. */
  ranking: HeroRank[];
}

const TRACKS = [
  { value: '', label: '전체' },
  { value: 'quantitative', label: '취미' },
  { value: 'qualitative', label: '도전' },
];

export function Board({
  items,
  loggedIn,
  featured,
  favoriteIds,
  hero,
}: {
  items: ConnectCardData[];
  loggedIn: boolean;
  /** 히어로 오른쪽 카드. 찜이 없으면 최신 커넥트가 온다. */
  featured?: { c: ConnectCardData; label: string; fresh: boolean } | null;
  favoriteIds: string[];
  hero: HeroProps;
}) {
  const favs = new Set(favoriteIds);
  const [track, setTrack] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [draft, setDraft] = useState<Filters>({});
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);
  const [prompt, setPrompt] = useState(false);

  // 커넥트가 30개 규모라 필터·정렬을 모두 화면에서 처리한다.
  // 서버를 다시 부르지 않으므로 조건을 바꿀 때 화면이 깜빡이지 않는다.
  const shown = items
    .filter((c) => {
      if (track && c.track !== track) return false;
      if (filters.status && c.status !== filters.status) return false;
      // '공통' 커넥트는 양 캠퍼스 필터 모두에 나와야 한다.
      if (!matchesCampus(c.campus, filters.campus)) return false;
      if (filters.openOnly && c.memberCount >= c.capacity) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === 'spots') {
        // '마감임박'을 남은 자리로 대체한 정렬. 자리가 적을수록 위로.
        const d = a.capacity - a.memberCount - (b.capacity - b.memberCount);
        if (d !== 0) return d;
      }
      if (filters.sort === 'popular') {
        const d = b.favoriteCount - a.favoriteCount;
        if (d !== 0) return d;
      }
      // 기본값이자 동점일 때의 기준. 모집 초반에는 찜이 전부 0이라
      // 인기순을 골라도 사실상 최신순으로 보인다.
      return b.createdAt.localeCompare(a.createdAt);
    });

  const active = Boolean(filters.status || filters.campus || filters.openOnly);
  const sortLabel = SORT_OPTS.find((o) => o.value === (filters.sort ?? ''))?.label ?? '최신순';

  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  const openFilter = () => {
    setDraft(filters);
    setSheet('filter');
  };

  return (
    <>
      {/* 히어로 밴드 (시안 40)

          왼쪽은 지금 해야 할 일이다. 모집 중에는 '무엇에 들어갈까'라서
          MBTI, 모집이 끝나면 '이번 주 활동을 인증했나'라서 인증이다.
          오른쪽은 랭킹이지만, 점수가 하나도 없는 동안에는 빈 카드가
          되므로 그때는 인기 커넥트를 대신 둔다 — 오른쪽 한 칸이
          통째로 비면 히어로가 왼쪽으로 쏠려 보인다. */}
      <section className="hero-band">
        <div className="shell">
          <h1 className="hero-heading">
            {hero.certifyHref ? (
              <>
                이번 주 활동을
                <br />
                인증해 주세요
              </>
            ) : (
              <>
                나와 맞는 커넥트를
                <br />
                찾아보세요
              </>
            )}
          </h1>

          <div className="hero-cards">
            {hero.certifyHref ? (
              <Link href={hero.certifyHref} className="mbti-card">
                <p className="mbti-eyebrow">활동 인증</p>
                <p className="mbti-title">
                  이번 주 활동
                  <br />
                  인증하기
                </p>
                <span className="mbti-go">
                  인증하러 가기 <IconArrowRight size={13} />
                </span>
              </Link>
            ) : (
              <Link href="/mbti" className="mbti-card">
                <p className="mbti-eyebrow">CONNECT MBTI</p>
                <p className="mbti-title">
                  성향으로 맞는
                  <br />
                  커넥트 찾기
                </p>
                <span className="mbti-go">
                  검사 시작하기 <IconArrowRight size={13} />
                </span>
              </Link>
            )}

            {hero.ranking.length > 0 ? (
              /* 시안은 어두운 판과 흰 판 두 가지가 있다. data-tone 만
                 바꾸면 뒤집힌다 — 왼쪽 카드가 어두운 동안에는 흰 쪽이
                 균형이 맞아 기본값을 light 로 둔다. */
              <Link href="/ranking" className="rank-card" data-tone="light">
                <p className="rank-card-title">커넥트 랭킹</p>
                <ol className="rank-mini">
                  {hero.ranking.map((r, i) => (
                    <li key={r.connectId}>
                      <span className="rank-mini-num">{r.rank ?? i + 1}</span>
                      {/* 좁은 화면에서는 잘린다. 길게 눌렀을 때
                          전체 이름이 보이도록 남겨 둔다. */}
                      <span className="rank-mini-name" title={r.name}>
                        {r.name}
                      </span>
                      {r.points !== null && (
                        <span className="rank-mini-points">{r.points}점</span>
                      )}
                    </li>
                  ))}
                </ol>
                <span className="rank-go">
                  전체 랭킹 보기 <IconArrowRight size={13} />
                </span>
              </Link>
            ) : (
              featured && (
                <Link href={`/connects/${featured.c.id}`} className="pick-card">
                  <p className="pick-label" data-fresh={featured.fresh}>
                    {featured.label}
                  </p>
                  <p className="pick-name">{featured.c.name}</p>
                  <p className="pick-meta">
                    {featured.fresh
                      ? `${featured.c.memberCount}/${featured.c.capacity}명 · 지금 신청받는 중`
                      : `${featured.c.favoriteCount}명이 찜 · ${featured.c.memberCount}/${featured.c.capacity}명`}
                  </p>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      <div className="shell board-layout">
        {/* 데스크탑 전용 필터 기둥 */}
        <aside className="filter-rail" aria-label="필터">
          <div className="rail-group" role="radiogroup" aria-label="모집 상태">
            <p className="rail-title">모집 상태</p>
            {STATUS_OPTS.map((o) => (
              <div
                key={o.value}
                className="rail-opt"
                role="radio"
                tabIndex={0}
                aria-checked={(filters.status ?? '') === o.value}
                onClick={() => setFilters((f) => ({ ...f, status: o.value }))}
                onKeyDown={(e) =>
                  e.key === 'Enter' && setFilters((f) => ({ ...f, status: o.value }))
                }
              >
                <span className="radio" aria-hidden="true" />
                {o.label}
              </div>
            ))}
          </div>

          <div className="rail-group" role="radiogroup" aria-label="캠퍼스">
            <p className="rail-title">캠퍼스</p>
            {CAMPUS_OPTS.map((o) => (
              <div
                key={o.value}
                className="rail-opt"
                role="radio"
                tabIndex={0}
                aria-checked={(filters.campus ?? '') === o.value}
                onClick={() => setFilters((f) => ({ ...f, campus: o.value }))}
                onKeyDown={(e) =>
                  e.key === 'Enter' && setFilters((f) => ({ ...f, campus: o.value }))
                }
              >
                <span className="radio" aria-hidden="true" />
                {o.label}
              </div>
            ))}
          </div>

          <div className="rail-group" role="radiogroup" aria-label="정렬">
            <p className="rail-title">정렬</p>
            {SORT_OPTS.map((o) => (
              <div
                key={o.value}
                className="rail-opt"
                role="radio"
                tabIndex={0}
                aria-checked={(filters.sort ?? '') === o.value}
                onClick={() => setFilters((f) => ({ ...f, sort: o.value }))}
                onKeyDown={(e) => e.key === 'Enter' && setFilters((f) => ({ ...f, sort: o.value }))}
              >
                <span className="radio" aria-hidden="true" />
                {o.label}
              </div>
            ))}
          </div>
        </aside>

        <div>
          <div className="toolbar" role="tablist" aria-label="트랙">
            <div className="seg">
              {TRACKS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  className="seg-item"
                  aria-selected={track === t.value}
                  onClick={() => setTrack(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="icon-btn"
              data-active={active}
              aria-label="필터 열기"
              onClick={openFilter}
            >
              <IconFilter />
            </button>
          </div>

          <div className="sortline">
            <button type="button" onClick={() => setSheet('sort')}>
              정렬: {sortLabel}
            </button>
          </div>

          {shown.length === 0 ? (
            <EmptyState hasFilters={active || !!track} onReset={() => { setFilters({}); setTrack(''); }} />
          ) : (
            <div className="cards">
              {shown.map((c) => (
                <ConnectCard
                  key={c.id}
                  c={c}
                  favorited={favs.has(c.id)}
                  loggedIn={loggedIn}
                  onBlocked={() => setPrompt(true)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FilterSheet
        open={sheet === 'filter'}
        filters={draft}
        onChange={set}
        onClose={() => setSheet(null)}
        onReset={() => setDraft({})}
        onApply={() => {
          setFilters((f) => ({ ...draft, sort: f.sort }));
          setSheet(null);
        }}
      />

      <SortSheet
        open={sheet === 'sort'}
        value={filters.sort}
        onClose={() => setSheet(null)}
        onSelect={(v) => {
          setFilters((f) => ({ ...f, sort: v }));
          setSheet(null);
        }}
      />

      <LoginPrompt open={prompt} onClose={() => setPrompt(false)} callbackUrl="/connects" />
    </>
  );
}
