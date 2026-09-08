'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/notice';
import { Sheet } from '@/components/ui/sheet';
import { DAYS, GOAL_TYPES } from '@/lib/connects/options';
import { REVIEW_REJECT_REASONS } from '@/lib/connects/review-reasons';
import { approveConnectAction, rejectConnectAction } from './actions';
import type { PendingConnect } from '@/lib/db/queries/admin';

/**
 * 확인 대기 목록.
 *
 * 판단에 필요한 것을 한 카드에 모은다 — 목표, 시점, 설명문, 개설자.
 * 다른 화면을 다녀오게 하면 한 건 처리하는 데 시간이 배로 든다.
 *
 * 설명문을 접지 않고 그대로 보여주는 이유는, 이 글이 나중에 추천의
 * 유일한 재료가 되기 때문이다. 확인 단계가 설명문 품질을 볼 수 있는
 * 유일한 지점이기도 하다.
 */
export function ReviewList({ items }: { items: PendingConnect[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingConnect | null>(null);
  const [, start] = useTransition();

  const run = (key: string, fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      setBusy(key);
      const r = await fn();
      if (r.error) setError(r.error);
      setBusy(null);
    });

  if (items.length === 0) {
    return (
      <section className="card-block" style={{ marginTop: 16 }}>
        <p className="mini-empty">확인을 기다리는 커넥트가 없어요.</p>
      </section>
    );
  }

  return (
    <>
      {error && <Notice>{error}</Notice>}

      <div className="review-list">
        {items.map((c) => {
          const goal = GOAL_TYPES.find((g) => g.value === c.goalType)?.label;
          const days = c.availableDays.map((d) => DAYS[d]).filter(Boolean);

          return (
            <article key={c.id} className="review-card">
              <header className="review-head">
                <div>
                  <h2 className="review-name">{c.name}</h2>
                  <p className="review-by">
                    {c.leaderCohort} {c.leaderName} · {c.leaderSlc} ·{' '}
                    {c.campus === '인문사회' ? '인사캠' : c.campus === '자연과학' ? '자과캠' : '공통'}
                  </p>
                </div>
                <Link href={`/connects/${c.id}`} className="btn btn--line btn--sm">
                  자세히
                </Link>
              </header>

              <p className="review-tagline">{c.tagline}</p>

              <dl className="review-goal">
                <div>
                  <dt>목표</dt>
                  <dd>
                    {goal && <Badge tone="track">{goal}</Badge>} {c.goalDetail}
                  </dd>
                </div>
                <div>
                  <dt>시점</dt>
                  <dd>
                    {c.goalDate ?? '미정'}
                    {c.activityPeriod && ` · ${c.activityPeriod}`}
                  </dd>
                </div>
                <div>
                  <dt>운영</dt>
                  <dd>
                    최대 {c.capacity}명{days.length > 0 && ` · 매주 ${days.join('·')}요일`}
                  </dd>
                </div>
              </dl>

              {c.description && <p className="review-desc">{c.description}</p>}

              <div className="review-actions">
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  disabled={busy === c.id}
                  onClick={() => setRejecting(c)}
                >
                  반려
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={busy === c.id}
                  onClick={() => run(c.id, () => approveConnectAction(c.id))}
                >
                  {busy === c.id ? '처리 중…' : '승인'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* C-09 반려 사유. 개설자가 무엇을 고칠지 알 수 있어야 한다. */}
      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} labelledBy="rv-title">
        <h2 className="sheet-title" id="rv-title">
          {rejecting?.name} 반려
        </h2>
        <p className="sheet-sub" style={{ textAlign: 'center', marginBottom: 16 }}>
          고른 사유가 개설자에게 그대로 전달돼요.
        </p>
        {REVIEW_REJECT_REASONS.map((r) => (
          <button
            key={r.value}
            type="button"
            className="opt opt--stack"
            onClick={() => {
              const t = rejecting!;
              setRejecting(null);
              run(t.id, () => rejectConnectAction(t.id, r.value));
            }}
          >
            <span className="opt-label">{r.label}</span>
            <span className="opt-text">{r.text}</span>
          </button>
        ))}
      </Sheet>
    </>
  );
}
