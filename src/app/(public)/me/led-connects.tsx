'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/notice';
import { Sheet } from '@/components/ui/sheet';
import { IconUser } from '@/components/ui/icon';
import { trackLabel } from '@/lib/connects/options';
import { REJECT_REASONS } from '@/lib/connects/reject-reasons';
import {
  approveAction,
  earlyCloseAction,
  rejectAction,
} from '@/app/(public)/connects/[id]/actions';
import type { LedApplicant, MyConnect } from '@/lib/db/queries/me';

/**
 * 내가 개설한 커넥트.
 *
 * 신청 처리를 여기서 바로 한다. 팀 관리 화면이 따로 있지만,
 * 승인 하나 누르러 화면을 옮겨 다니면 신청을 방치하게 된다.
 * 지원서를 읽어야 하는 경우만 시트를 연다.
 */
export function LedConnects({
  connects,
  applicants,
}: {
  connects: MyConnect[];
  applicants: LedApplicant[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [letter, setLetter] = useState<LedApplicant | null>(null);
  const [rejecting, setRejecting] = useState<LedApplicant | null>(null);
  const [, start] = useTransition();

  const run = (key: string, fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      setBusy(key);
      const r = await fn();
      if (r.error) setError(r.error);
      setBusy(null);
    });

  if (connects.length === 0) {
    return (
      <section className="card-block">
        <p className="mini-empty">아직 개설한 커넥트가 없어요.</p>
      </section>
    );
  }

  return (
    <>
      {error && <Notice>{error}</Notice>}

      <div className="led-list">
        {connects.map((c) => {
          const mine = applicants.filter((a) => a.connectId === c.id);
          const pending = mine.filter((a) => a.status === 'pending');
          const closed = c.status === 'early_closed';
          const canToggle = c.status === 'recruiting' || c.status === 'early_closed';

          return (
            <article key={c.id} className="led-card">
              <header className="led-head">
                <Link href={`/connects/${c.id}`} className="led-name">
                  {c.name}
                </Link>
                <span className="led-meta">
                  <span className="badge badge--open">참여 중 · 팀장</span>
                  {c.memberCount}/{c.capacity}명 · {trackLabel(c.track)}
                </span>
              </header>

              {/* 확인 대기·반려는 개설자가 알아야 할 상태다.
                  씨앗판에 없는 이유가 여기 있다. */}
              {(c.status === 'pending_review' || c.status === 'rejected') && (
                <p className="led-status">
                  <StatusBadge status={c.status} />
                  <span>
                    {c.status === 'pending_review'
                      ? '운영진 확인 후 씨앗판에 올라가요.'
                      : '반려되었어요. 내용을 고쳐 다시 신청해 주세요.'}
                  </span>
                  {c.status === 'rejected' && (
                    <Link href={`/connects/${c.id}/edit`} className="btn btn--line btn--sm">
                      수정하기
                    </Link>
                  )}
                </p>
              )}

              {mine.length > 0 && (
                <div className="led-applicants">
                  <p className="led-subtitle">신청자 ({mine.length})</p>

                  {mine.map((a) => (
                    <div key={a.applicationId} className="led-row">
                      <span className="led-person">
                        <IconUser size={17} />
                        {a.name}
                      </span>

                      {a.hasMessage && (
                        <button
                          type="button"
                          className="badge badge--neutral led-letter"
                          onClick={() => setLetter(a)}
                        >
                          한 마디
                        </button>
                      )}

                      <span className="led-row-actions">
                        {a.status === 'approved' ? (
                          <span className="badge badge--closed">참여 완료</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--sm"
                              disabled={busy === a.applicationId || c.memberCount >= c.capacity}
                              onClick={() =>
                                run(a.applicationId, () =>
                                  approveAction(c.id, a.applicationId),
                                )
                              }
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--danger"
                              disabled={busy === a.applicationId}
                              onClick={() => setRejecting(a)}
                            >
                              거부
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="led-foot">
                {!canToggle && (
                  <Link href={`/connects/${c.id}/edit`} className="btn btn--line btn--sm">
                    수정
                  </Link>
                )}
                {canToggle && (
                  <>
                  <Link href={`/connects/${c.id}/edit`} className="btn btn--line btn--sm">
                    수정
                  </Link>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={busy === c.id}
                    onClick={() => run(c.id, () => earlyCloseAction(c.id, !closed))}
                  >
                    {busy === c.id ? '변경 중…' : closed ? '다시 모집하기' : '마감하기'}
                  </button>
                    {closed && <Badge tone="review">마감 상태 · 신청은 계속 받아요</Badge>}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* 지원서 전문 */}
      <Sheet open={!!letter} onClose={() => setLetter(null)} labelledBy="letter-title">
        <h2 className="sheet-title" id="letter-title">
          {letter?.name}님의 한 마디
        </h2>
        <p className="applicant-letter" style={{ WebkitLineClamp: 'unset' }}>
          {letter?.message}
        </p>
      </Sheet>

      {/* D-03 거절 사유 */}
      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} labelledBy="reject-title">
        <h2 className="sheet-title" id="reject-title">
          {rejecting?.name}님 신청 거부
        </h2>
        <p className="sheet-sub" style={{ textAlign: 'center', marginBottom: 16 }}>
          고른 사유가 신청한 사람에게 전달돼요.
        </p>
        {REJECT_REASONS.map((r) => (
          <button
            key={r.value}
            type="button"
            className="opt"
            onClick={() => {
              const t = rejecting!;
              setRejecting(null);
              run(t.applicationId, () => rejectAction(t.connectId, t.applicationId, r.value));
            }}
          >
            <span>{r.label}</span>
          </button>
        ))}
      </Sheet>
    </>
  );
}
