'use client';

import { useState } from 'react';

/**
 * 커넥트 링크 공유.
 *
 * 초대 링크가 아니라 상세 페이지 주소를 보낸다. 주소창을 복사해
 * 붙여넣는 일을 대신하는 편의 기능이라, 참여 여부와 상관없이
 * 누구에게나 보인다.
 *
 * 모바일에서는 시스템 공유창이 뜬다. 카카오톡으로 바로 보낼 수
 * 있어야 실제로 공유가 일어난다. 데스크탑에서는 복사로 떨어진다.
 */
export function ShareLink({
  connectId,
  connectName,
  variant = 'block',
}: {
  connectId: string;
  connectName: string;
  /** block — 안내 문구까지 있는 상자 / inline — 버튼 하나 */
  variant?: 'block' | 'inline';
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/connects/${connectId}`
        : `/connects/${connectId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: connectName,
          text: `'${connectName}' 같이 할래요?`,
          url,
        });
        return;
      } catch {
        // 사용자가 공유창을 닫은 경우. 복사로 넘어가지 않는다.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 주소를 복사해 주세요', url);
    }
  };

  if (variant === 'inline') {
    return (
      <button type="button" className="btn btn--line btn--sm" onClick={share}>
        {copied ? '복사했어요' : '링크 공유'}
      </button>
    );
  }

  return (
    <section className="share-box">
      <p className="share-text">링크를 공유하여 함께 할 사람을 찾아봐요!</p>
      <button type="button" className="btn btn--block" onClick={share}>
        {copied ? '링크를 복사했어요' : '링크 공유하기'}
      </button>
    </section>
  );
}
