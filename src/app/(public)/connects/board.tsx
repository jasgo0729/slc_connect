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

const TRACKS = [
  { value: '', label: '전체' },
  { value: 'quantitative', label: '정량' },
  { value: 'qualitative', label: '정성' },
];

export function Board({
  items,
  loggedIn,
  featured,
}: {
  items: ConnectCardData[];
  loggedIn: boolean;
  featured?: ConnectCardData;
}) {
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
      if (filters.campus && c.campus !== filters.campus) return false;
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
      {/* 히어로 밴드 */}
      <section className="hero-band">
        <div className="shell">
          <h1 className="hero-heading">
            나와 맞는 커넥트를
            <br />
            찾아보세요
          </h1>

          <div className="hero-cards">
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

            {featured && (
              <Link href={`/connects/${featured.id}`} className="pick-card">
                <p className="pick-label">인기</p>
                <p className="pick-name">{featured.name}</p>
                <p className="pick-meta">
                  모집중 · {featured.memberCount}/{featured.capacity}명
                </p>
              </Link>
            )}

            <Link href="/recommend" className="pick-card hero-card-hide-sm">
              <p className="pick-label" style={{ color: 'var(--blue)' }}>
                추천
              </p>
              <p className="pick-name">키워드로 찾기</p>
              <p className="pick-meta">한 줄만 적으면 후보를 골라 드려요</p>
            </Link>
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
                  onFavorite={() => !loggedIn && setPrompt(true)}
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
