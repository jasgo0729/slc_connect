'use client';

import { useState, useTransition } from 'react';
import { Sheet } from './ui/sheet';
import { Notice } from './ui/notice';
import { leaveAction } from '@/app/(public)/connects/[id]/actions';

/**
 * G-15 이탈 · 커넥트 삭제.
 *
 * 팀장은 후임을 지정해야 나갈 수 있다. 후임 선택을 필수 입력으로 두면
 * 팀장 없는 커넥트가 구조적으로 생기지 않는다.
 *
 * 팀장 혼자뿐이면 넘길 사람이 없으므로 커넥트가 지워진다.
 * 되돌릴 수 없어 문구를 다르게 쓴다.
 */
export function LeaveButton({
  connectId,
  isLeader,
  candidates,
}: {
  connectId: string;
  isLeader: boolean;
  candidates: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [successor, setSuccessor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const alone = isLeader && candidates.length === 0;
  const needsSuccessor = isLeader && candidates.length > 0;

  const run = () =>
    start(async () => {
      setError(null);
      const r = await leaveAction(connectId, successor || undefined);
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
    });

  return (
    <>
      <button type="button" className="textbtn leave-link" onClick={() => setOpen(true)}>
        {alone ? '커넥트 삭제하기' : '커넥트 나가기'}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="leave-title">
        <div className="sheet--form">
          <h2 className="sheet-heading" id="leave-title" style={{ paddingRight: 0 }}>
            {alone ? '커넥트를 삭제할까요?' : '커넥트에서 나갈까요?'}
          </h2>
          <p className="sheet-sub">
            {alone
              ? '아직 팀원이 없어 커넥트가 사라집니다. 되돌릴 수 없어요.'
              : needsSuccessor
                ? '팀장 자리를 넘길 사람을 골라주세요.'
                : '다시 신청하면 들어올 수 있어요.'}
          </p>

          {needsSuccessor && (
            <div className="field" style={{ marginTop: 18 }}>
              <label className="field-label" htmlFor="successor">
                다음 팀장
              </label>
              <select
                id="successor"
                className="input"
                value={successor}
                onChange={(e) => setSuccessor(e.target.value)}
              >
                <option value="">선택해주세요</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <Notice>{error}</Notice>}

          <button
            type="button"
            className="btn btn--block btn--danger"
            style={{ marginTop: 20 }}
            disabled={pending || (needsSuccessor && !successor)}
            onClick={run}
          >
            {pending ? '처리 중…' : alone ? '삭제하기' : '나가기'}
          </button>
          <button type="button" className="textbtn" style={{ width: '100%' }} onClick={() => setOpen(false)}>
            취소
          </button>
        </div>
      </Sheet>
    </>
  );
}
