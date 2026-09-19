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
}: {
  connectId: string;
  /** 온라인 인증은 방학 기간에만 연다(G-09). */
  showOnline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const go = (type: string) => {
    setOpen(false);
    router.push(`/connects/${connectId}/certify?type=${type}`);
  };

  return (
    <>
      <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
        인증하기
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
