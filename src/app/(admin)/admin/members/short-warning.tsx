'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { sendShortWarningsAction } from '../actions';

/**
 * D-10 인원 미달 경고 발송.
 *
 * 마감 며칠 전에 한 번 누른다. 커넥트마다 인원이 달라 문구가
 * 개인화되므로 공지 발송(J-04)으로는 대체할 수 없다.
 *
 * 되돌릴 수 없어 확인을 한 번 받는다.
 */
export function ShortWarningButton({ count }: { count: number }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendShortWarningsAction();
      setConfirming(false);
      if (r.error) setError(r.error);
      else setResult(`${r.sent ?? 0}개 커넥트의 팀장에게 보냈어요.`);
    });

  if (count === 0) return null;

  return (
    <>
      {error && <Notice>{error}</Notice>}
      {result && <Notice tone="info">{result}</Notice>}

      {confirming ? (
        <div className="warn-confirm">
          <p className="field-hint">
            미달 커넥트 <b>{count}개</b>의 팀장에게 각자의 인원이 담긴 경고를 보냅니다.
          </p>
          <div className="actionbar-row">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              취소
            </button>
            <button type="button" className="btn btn--sm" onClick={send} disabled={pending}>
              {pending ? '보내는 중…' : '보내기'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--line btn--sm"
          onClick={() => setConfirming(true)}
        >
          미달 경고 보내기
        </button>
      )}
    </>
  );
}
