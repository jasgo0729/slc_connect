'use client';

import { useState, useTransition } from 'react';
import { Sheet } from './ui/sheet';
import { Notice } from './ui/notice';
import { leaveAction } from '@/app/(public)/connects/[id]/actions';

/**
 * G-15 이탈 · 커넥트 삭제.
 *
 * 팀장이 나가면 다음으로 들어온 사람에게 자동으로 넘어간다.
 * 고르게 하면 나가려는 사람이 한 번 더 판단해야 하고, 그 부담 때문에
 * 이탈을 미루면 팀 전체가 애매한 상태로 남는다.
 *
 * 누구에게 넘어가는지는 미리 보여준다. 모른 채로 넘기게 하면
 * 나중에 "왜 저 사람이 팀장이지"가 된다.
 */
export function LeaveButton({
  connectId,
  isLeader,
  nextLeader,
}: {
  connectId: string;
  isLeader: boolean;
  /** 들어온 순서로 다음 사람. 없으면 팀장 혼자다. */
  nextLeader?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const alone = isLeader && !nextLeader;

  const run = () =>
    start(async () => {
      setError(null);
      const r = await leaveAction(connectId);
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
              : isLeader
                ? `팀장 자리는 ${nextLeader}님에게 넘어갑니다.`
                : '다시 신청하면 들어올 수 있어요.'}
          </p>

          {error && <Notice>{error}</Notice>}

          <button
            type="button"
            className="btn btn--block btn--danger"
            style={{ marginTop: 20 }}
            disabled={pending}
            onClick={run}
          >
            {pending ? '처리 중…' : alone ? '삭제하기' : '나가기'}
          </button>
          <button
            type="button"
            className="textbtn"
            style={{ width: '100%' }}
            onClick={() => setOpen(false)}
          >
            취소
          </button>
        </div>
      </Sheet>
    </>
  );
}
