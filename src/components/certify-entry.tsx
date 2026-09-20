'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from './ui/sheet';
import { DEADLINE_NOTICE } from '@/lib/connects/certification';

/**
 * 활동 인증 진입.
 *
 * 유형을 먼저 고르게 한다. 사진 요구사항이 유형마다 달라서,
 * 한 화면에 다 넣으면 필요 없는 칸까지 보이고 무엇을 올려야
 * 하는지 흐려진다.
 *
 * 마감 규칙(G-18)을 고르기 전에 보여준다. 다 올리고 나서
 * "기한이 지났다"고 하면 그 시간이 통째로 버려진다.
 */
export function CertifyEntry({
  connectId,
  showOnline,
  label = '인증하기',
  className = 'btn btn--sm',
}: {
  connectId: string;
  /** 온라인 인증은 방학 기간에만 연다(G-09). */
  showOnline: boolean;
  /**
   * 여는 버튼의 문구와 모양.
   *
   * 인증 이력 옆에서는 작은 '인증하기', 팀 페이지 하단에서는
   * 넓은 '활동 인증으로'다. 같은 시트를 여는 버튼이라 컴포넌트를
   * 나누지 않고 겉모습만 받는다 — 나누면 시트 문구(G-18 마감
   * 안내)를 고칠 때 두 곳을 고쳐야 한다.
   */
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const go = (type: string) => {
    setOpen(false);
    router.push(`/connects/${connectId}/certify?type=${type}`);
  };

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="certify-entry">
        <div className="sheet--form">
          <h2 className="sheet-title" id="certify-entry" style={{ textAlign: 'left' }}>
            활동 인증
          </h2>
          <p className="certify-notice">{DEADLINE_NOTICE}</p>

          <div className="certify-choices">
            <button type="button" className="btn btn--line btn--block" onClick={() => go('offline')}>
              커넥트 활동 인증 →
            </button>
            <button type="button" className="btn btn--line btn--block" onClick={() => go('cross')}>
              CCC 활동 인증 →
            </button>
            {showOnline && (
              <button
                type="button"
                className="btn btn--line btn--block"
                onClick={() => go('online')}
              >
                온라인 활동 인증 →
              </button>
            )}
          </div>

          <button type="button" className="textbtn certify-close" onClick={() => setOpen(false)}>
            닫기
          </button>

          {!showOnline && (
            <p className="certify-foot">* 온라인 활동 인증은 방학 기간에만 노출됩니다</p>
          )}
        </div>
      </Sheet>
    </>
  );
}
