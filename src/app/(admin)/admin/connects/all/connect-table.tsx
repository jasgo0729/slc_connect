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

export function ConnectTable({ items, status }: { items: AdminConnect[]; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const change = (c: AdminConnect, delta: number) =>
    start(async () => {
      setError(null);
      setBusy(c.id);
      const r = await setCapacityAction(c.id, c.capacity + delta);
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
            <span>정원</span>
          </div>

          {items.map((c) => (
            <div key={c.id} className="atable-row">
              <div className="atable-main">
                <Link href={`/connects/${c.id}`} className="atable-name">
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
