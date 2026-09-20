'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { recalculateAllAction, recalculateOneAction } from './actions';

/**
 * 전체 재계산.
 *
 * 규칙서의 숫자를 고친 뒤에만 쓴다. 평소에는 승인할 때마다 해당
 * 커넥트가 알아서 다시 계산된다.
 *
 * 확인을 한 번 받는다. 검수 승인과 달리 이 버튼은 모든 팀의
 * 점수를 건드리고, 자주 누를 일도 아니다.
 */
export function RecalcButton() {
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setAsking(false);
      const r = await recalculateAllAction();
      setResult(
        r.error ?? `${r.connects}개 커넥트를 다시 계산했어요. 합계 ${r.total}점.`,
      );
    });

  return (
    <div style={{ marginTop: 14 }}>
      {result && <Notice>{result}</Notice>}

      {asking ? (
        <div className="cert-actions" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn btn--line btn--sm"
            onClick={() => setAsking(false)}
            disabled={pending}
          >
            취소
          </button>
          <button type="button" className="btn btn--sm" onClick={run} disabled={pending}>
            {pending ? '계산 중…' : '모든 팀 다시 계산'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--line btn--sm"
          onClick={() => setAsking(true)}
          disabled={pending}
        >
          규칙을 바꿨다면 · 전체 재계산
        </button>
      )}
    </div>
  );
}

/**
 * 한 팀만 다시 계산.
 *
 * 전체 재계산과 달리 자주 쓴다 — 점수가 이상해 보이는 팀을 확인할
 * 때다. 계산이 멱등이라 눌러서 숫자가 바뀌면 그 자체가 단서다
 * (인증을 손으로 고쳤거나, 규칙을 바꾸고 재계산을 안 돌린 것이다).
 */
export function RowRecalc({ connectId }: { connectId: string }) {
  const [total, setTotal] = useState<number | null>(null);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="textbtn score-board-recalc"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await recalculateOneAction(connectId);
          setTotal(r.total ?? null);
        })
      }
    >
      {pending ? '…' : total !== null ? `${total}점` : '재계산'}
    </button>
  );
}
