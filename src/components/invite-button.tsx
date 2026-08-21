'use client';

import { useState } from 'react';
import { IconCheck, IconLink } from './ui/icon';

/**
 * C-10 초대 링크 복사.
 *
 * 팀장에게만 보인다. 비공개 커넥트는 이 링크가 유일한 입구라
 * 개설 직후 가장 먼저 눌러야 하는 버튼이다.
 */
export function InviteButton({ token }: { token: string }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드 권한이 없거나 안전하지 않은 컨텍스트일 때.
      // 실패를 조용히 넘기면 사용자는 복사됐다고 믿는다.
      window.prompt('아래 주소를 복사해 주세요', url);
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <button type="button" className="ghost-btn" onClick={copy}>
      {done ? <IconCheck size={15} /> : <IconLink />}
      {done ? '복사했어요' : '초대 링크 복사'}
    </button>
  );
}
