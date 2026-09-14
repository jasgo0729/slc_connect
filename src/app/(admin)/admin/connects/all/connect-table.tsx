'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/notice';
import { CAPACITY_MAX, CAPACITY_MIN, trackLabel } from '@/lib/connects/options';
import { setCapacityAction } from '../../actions';
import type { AdminConnect } from '@/lib/db/queries/admin-ops';

const FILTERS = [
  { value: '', label: '전체' },
  { value: 'recruiting', label: '모집 중' },
  { value: 'pending_review', label: '확인 대기' },
  { value: 'full_closed', label: '정원 마감' },
  { value: 'early_closed', label: '조기 마감' },
  { value: 'rejected', label: '반려' },
  { value: 'confirmed', label: '확정' },
];

/**
 * 정렬 기준.
 *
 * 찜이 많은데 인원이 안 차는 커넥트를 찾는 것이 이 화면의 쓸모다.
 * 관심은 있는데 신청으로 이어지지 않은 곳이라, 초대 링크를 한 번
 * 더 돌리라고 알리면 채워질 여지가 있다.
 */
const SORTS = [
  { value: 'recent', label: '최신순' },
  { value: 'favorite', label: '찜 많은 순' },
  { value: 'short', label: '인원 적은 순' },
] as const;

type Sort = (typeof SORTS)[number]['value'];

export function ConnectTable({ items, status }: { items: AdminConnect[]; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const [, start] = useTransition();

  const sorted = [...items].sort((a, b) => {
    if (sort === 'favorite') return b.favoriteCount - a.favoriteCount;
    if (sort === 'short') return a.memberCount - b.memberCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalFavorites = items.reduce((n, c) => n + c.favoriteCount, 0);

  const change = (c: AdminConnect, delta: number) =>
    start(async () => {
      setError(null);
      setBusy(c.id);
      const r = await setCapacityAction(c.id, c.capacity + delta, c.capacity);
      if (r.error) setError(r.error);
      setBusy(null);
    });

  return (
    <>
      <div className="chips" style={{ marginTop: 16 }}>
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/connects/all?status=${f.value}` : '/admin/connects/all'}
            className="chip"
            aria-pressed={status === f.value}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="atable-bar">
        <div className="chips">
          {SORTS.map((o) => (
            <button
              key={o.value}
              type="button"
              className="chip"
              aria-pressed={sort === o.value}
              onClick={() => setSort(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="atable-total">
          {items.length}개 · 찜 {totalFavorites}건
        </span>
      </div>

      {error && <Notice>{error}</Notice>}

      {items.length === 0 ? (
        <section className="card-block">
          <p className="mini-empty">해당하는 커넥트가 없어요.</p>
        </section>
      ) : (
        <div className="atable">
          <div className="atable-head">
            <span>커넥트</span>
            <span>상태</span>
            <span>인원</span>
            <span>대기</span>
            <span>찜</span>
            <span>정원</span>
          </div>

          {sorted.map((c) => (
            <div key={c.id} className="atable-row">
              <div className="atable-main">
                {/* 운영 화면끼리 이어 둔다. 서비스 화면으로 나가면
                    가린 이름만 보여 누가 있는지 알 수 없다. */}
                <Link href={`/admin/connects/${c.id}`} className="atable-name">
                  {c.name}
                </Link>
                <span className="atable-sub">
                  {trackLabel(c.track)} ·{' '}
                  {c.campus === '인문사회' ? '인사캠' : c.campus === '자연과학' ? '자과캠' : '공통'} ·{' '}
                  {c.leaderName}
                  {!c.isPublic && ' · 비공개'}
                </span>
              </div>

              <span>
                <StatusBadge status={c.status} />
              </span>
              <span className="atable-n">
                {c.memberCount}/{c.capacity}
              </span>
              <span className="atable-n">{c.applicationCount || '—'}</span>
              {/* 찜은 많은데 인원이 안 차는 곳을 눈에 띄게 한다. */}
              <span
                className="atable-n atable-fav"
                data-hot={c.favoriteCount >= 5 && c.memberCount < c.capacity}
              >
                {c.favoriteCount || '—'}
              </span>

              <span className="atable-cap">
                <button
                  type="button"
                  onClick={() => change(c, -1)}
                  disabled={busy === c.id || c.capacity <= CAPACITY_MIN}
                  aria-label={`${c.name} 정원 줄이기`}
                >
                  −
                </button>
                <b>{c.capacity}</b>
                <button
                  type="button"
                  onClick={() => change(c, 1)}
                  disabled={busy === c.id || c.capacity >= CAPACITY_MAX}
                  aria-label={`${c.name} 정원 늘리기`}
                >
                  +
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
