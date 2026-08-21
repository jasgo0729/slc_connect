'use client';

import { useEffect } from 'react';

/**
 * 바텀시트.
 *
 * 모바일에서는 아래에서 올라오고, 900px 이상에서는 가운데 모달이 된다
 * (전환은 CSS가 한다). 필터·정렬·로그인 유도·프로필 입력이 모두 이 껍데기를 쓴다.
 */
export function Sheet({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet">
        <div className="sheet-grip" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
