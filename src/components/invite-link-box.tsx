'use client';

import { useState } from 'react';

/**
 * C-10 초대 링크.
 *
 * 주소를 보여주고 복사한다. 버튼만 두면 무엇이 복사됐는지 알 수 없고,
 * 비공개 커넥트에서는 이 링크가 유일한 입구라 확인이 필요하다.
 */
export function InviteLinkBox({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [url, setUrl] = useState(`/invite/${token}`);

  // 서버 렌더 시점에는 도메인을 알 수 없다. 화면에 붙은 뒤 채운다.
  if (typeof window !== 'undefined' && !url.startsWith('http')) {
    setUrl(`${window.location.origin}/invite/${token}`);
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드 권한이 없거나 안전하지 않은 컨텍스트일 때.
      // 조용히 실패하면 사용자는 복사됐다고 믿는다.
      window.prompt('아래 주소를 복사해 주세요', url);
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="linkbox">
      <span className="linkbox-url" title={url}>
        {url.replace(/^https?:\/\//, '')}
      </span>
      <button type="button" className="linkbox-copy" onClick={copy}>
        {done ? '복사됨' : '복사'}
      </button>
    </div>
  );
}
