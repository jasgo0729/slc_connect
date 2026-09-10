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
  secondary,
}: {
  open: boolean;
  tone?: 'ok' | 'error';
  title: string;
  body?: string;
  action: string;
  onAction: () => void;
  /** 아래에 붙는 약한 선택지. 없으면 확인 하나만 둔다. */
  secondary?: { label: string; onClick: () => void };
}) {
  if (!open) return null;
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <div className={`modal-icon modal-icon--${tone === 'ok' ? 'ok' : 'err'}`}>
          {tone === 'ok' ? <IconCheck /> : <IconAlert />}
        </div>
        {/* 제목에 줄바꿈이 들어올 수 있다. white-space 로 살린다. */}
        <h2 className="modal-title" style={{ whiteSpace: 'pre-line' }}>
          {title}
        </h2>
        {body && <p className="modal-body">{body}</p>}
        <button type="button" className="btn btn--block" onClick={onAction}>
          {action}
        </button>
        {secondary && (
          <button type="button" className="textbtn modal-second" onClick={secondary.onClick}>
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}
