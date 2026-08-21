'use client';

import { IconAlert, IconCheck } from './icon';

/**
 * 가운데 알림 모달. 환영·완료·실패 팝업이 전부 이걸 쓴다.
 * 배경을 눌러도 닫히지 않는다 — 확인을 받아야 하는 알림이기 때문이다.
 */
export function Modal({
  open,
  tone = 'ok',
  title,
  body,
  action,
  onAction,
}: {
  open: boolean;
  tone?: 'ok' | 'error';
  title: string;
  body?: string;
  action: string;
  onAction: () => void;
}) {
  if (!open) return null;
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <div className={`modal-icon modal-icon--${tone === 'ok' ? 'ok' : 'err'}`}>
          {tone === 'ok' ? <IconCheck /> : <IconAlert />}
        </div>
        <h2 className="modal-title">{title}</h2>
        {body && <p className="modal-body">{body}</p>}
        <button type="button" className="btn btn--block" onClick={onAction}>
          {action}
        </button>
      </div>
    </div>
  );
}
