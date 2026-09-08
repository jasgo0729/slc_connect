'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { InviteButton } from '@/components/invite-button';
import { Sheet } from '@/components/ui/sheet';
import { IconUser } from '@/components/ui/icon';
import { REJECT_REASONS } from '@/lib/connects/reject-reasons';
import { approveAction, earlyCloseAction, rejectAction } from '../actions';

interface Applicant {
  id: string;
  name: string;
  cohort: string;
  campus: string;
  slc: string;
  major: string | null;
  bio: string | null;
  residence: string | null;
  mbtiType: string | null;
  message: string | null;
}

/**
 * 팀장이 하는 세 가지 — 신청 처리(D-02·D-03), 조기 마감(D-06), 초대(C-10).
 *
 * 신청자 정보를 한 카드에 모아 보여준다. 승인 여부를 판단하려면
 * 이름만으로는 부족하고, 프로필을 보러 다른 화면에 다녀오게 하면
 * 60~90건을 처리할 수 없다.
 */
export function ManagePanel({
  connectId,
  status,
  capacity,
  memberCount,
  pending,
  members,
  inviteToken,
}: {
  connectId: string;
  status: string;
  capacity: number;
  memberCount: number;
  pending: Applicant[];
  members: string[];
  inviteToken: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Applicant | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const full = memberCount >= capacity;
  const closed = status === 'early_closed';

  const run = (key: string, fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      setBusy(key);
      const r = await fn();
      if (r.error) setError(r.error);
      setBusy(null);
    });

  return (
    <>
      {error && <Notice>{error}</Notice>}

      {/* ── 신청 처리 ── */}
      <h2 className="me-sectitle me-sectitle--gap">
        신청 {pending.length > 0 && <span className="count-pill">{pending.length}</span>}
      </h2>

      {pending.length === 0 ? (
        <section className="card-block">
          <p className="mini-empty">아직 새로운 신청이 없어요.</p>
        </section>
      ) : (
        <div className="applicants">
          {pending.map((p) => (
            <article key={p.id} className="applicant">
              <div className="applicant-head">
                <div className="avatar avatar--sm">
                  <IconUser size={20} />
                </div>
                <div>
                  <p className="applicant-name">{p.name}</p>
                  <p className="applicant-meta">
                    {[p.cohort, p.slc, p.major].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              {/* 지원서가 있으면 그것을 먼저 보여준다. 이 커넥트에
                  왜 오고 싶은지가 프로필보다 판단에 가깝다. */}
              {p.message ? (
                <blockquote className="applicant-letter">{p.message}</blockquote>
              ) : (
                p.bio && <p className="applicant-bio">{p.bio}</p>
              )}

              <div className="chip-row" style={{ marginTop: 10 }}>
                {p.mbtiType && <span className="badge badge--neutral">{p.mbtiType}</span>}
                {p.residence && (
                  <span className="badge badge--neutral">
                    방학 {p.residence.split(/\s+/)[0]}
                  </span>
                )}
                <span className="badge badge--neutral">
                  {p.campus === '인문사회' ? '인사캠' : '자과캠'}
                </span>
              </div>

              <div className="applicant-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={busy === p.id}
                  onClick={() => setRejecting(p)}
                >
                  거절
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={busy === p.id || full}
                  onClick={() => run(p.id, () => approveAction(connectId, p.id))}
                >
                  {full ? '자리 없음' : busy === p.id ? '처리 중…' : '승인'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── 현재 팀원 ── */}
      <h2 className="me-sectitle me-sectitle--gap">
        팀원 <span className="me-sectitle-sub">{memberCount}/{capacity}</span>
      </h2>
      <section className="card-block">
        <div className="chip-row" style={{ marginTop: 0 }}>
          {members.map((m) => (
            <span key={m} className="badge badge--neutral">
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* ── 모집 상태 ── */}
      <h2 className="me-sectitle me-sectitle--gap">모집</h2>
      <section className="card-block">
        <InviteButton token={inviteToken} />

        <div className="toggle-row">
          <div>
            <p className="toggle-label">{closed ? '조기 마감 중' : '모집 중'}</p>
            <p className="field-hint">
              {closed
                ? '목록에는 마감으로 보이지만 신청은 계속 받아요. 승인한 사람만 들어옵니다.'
                : '지금 닫아도 신청은 계속 받아요. 나중에 자리가 생기면 승인하면 됩니다.'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--line btn--sm"
            disabled={busy === 'close' || (status !== 'recruiting' && status !== 'early_closed')}
            onClick={() => run('close', () => earlyCloseAction(connectId, !closed))}
          >
            {busy === 'close' ? '변경 중…' : closed ? '다시 모집' : '조기 마감'}
          </button>
        </div>
      </section>

      {/* D-03 거절 사유. 팀장이 직접 문장을 쓰지 않아도 되게 한다. */}
      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} labelledBy="reject-title">
        <h2 className="sheet-title" id="reject-title">
          {rejecting?.name}님 신청 거절
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
              const target = rejecting!;
              setRejecting(null);
              run(target.id, () => rejectAction(connectId, target.id, r.value));
            }}
          >
            <span>{r.label}</span>
          </button>
        ))}
      </Sheet>
    </>
  );
}
