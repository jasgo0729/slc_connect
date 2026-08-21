'use client';

import { Sheet } from './ui/sheet';

/**
 * 비로그인 상태에서 찜·신청 같은 행동을 눌렀을 때.
 *
 * 화면 전체를 로그인으로 밀어내지 않고 시트로 물어본다.
 * 목록을 보던 맥락을 잃지 않게 하려는 것이고,
 * 로그인 후에는 callbackUrl로 이 자리에 돌아온다.
 */
export function LoginPrompt({
  open,
  onClose,
  reason = '찜하려면 로그인해 주세요.',
  callbackUrl,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
  callbackUrl?: string;
}) {
  const href = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login';

  return (
    <Sheet open={open} onClose={onClose} labelledBy="login-prompt-title">
      <div style={{ textAlign: 'center', paddingBottom: 4 }}>
        <h2 className="sheet-heading" id="login-prompt-title" style={{ paddingRight: 0 }}>
          로그인이 필요해요
        </h2>
        <p className="sheet-sub">{reason}</p>
        <a href={href} className="btn btn--block" style={{ marginTop: 20 }}>
          로그인하기
        </a>
        <button type="button" className="textbtn" onClick={onClose}>
          다음에 하기
        </button>
      </div>
    </Sheet>
  );
}
