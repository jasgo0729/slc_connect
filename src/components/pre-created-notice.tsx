'use client';

import { useEffect, useState } from 'react';
import { Sheet } from './ui/sheet';
import { IconSpark } from './ui/icon';

/**
 * 사전 개설 커넥트 안내.
 *
 * TF가 미리 열어 둔 커넥트는 참여자가 만든 것과 성격이 다르다.
 * 개설자가 없어 0명부터 시작하고, 무엇을 할지도 정해져 있지 않다.
 * 이걸 모르고 들어오면 "왜 아무도 없지"로 읽힌다.
 *
 * 한 번 보고 나면 그 세션 동안은 다시 띄우지 않는다. 목록을 오가며
 * 여러 커넥트를 보는 동안 같은 안내가 계속 뜨면 읽지 않게 된다.
 */
const NOTES = [
  '개설자가 없어 인원이 0명부터 시작해요.',
  '무엇을 어떻게 할지는 첫 만남에서 팀원들과 자율적으로 정해요.',
  '같은 주제가 인사캠과 자과캠에 각각 있어요. 활동 캠퍼스를 확인하고 지원해 주세요.',
  '최소 인원 4명을 채우지 못하면 팀이 결성되지 않을 수 있어요. 함께할 사람이 있다면 초대 링크를 공유해 주세요.',
];

const SEEN_KEY = 'pre-created-notice-seen';

export function PreCreatedNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      // 시크릿 모드 등에서 접근이 막힐 수 있다. 그때는 그냥 띄운다.
    }
    setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // 저장하지 못해도 화면은 닫힌다.
    }
  };

  return (
    <>
      <button type="button" className="pre-badge" onClick={() => setOpen(true)}>
        <IconSpark size={13} />
        사전 개설 커넥트
      </button>

      <Sheet open={open} onClose={close} labelledBy="pre-title">
        <div className="sheet--form">
          <div className="pre-icon" aria-hidden="true">
            <IconSpark size={22} />
          </div>

          <h2 className="sheet-heading" id="pre-title" style={{ paddingRight: 0, textAlign: 'center' }}>
            사전 개설 커넥트예요
          </h2>
          <p className="sheet-sub" style={{ textAlign: 'center' }}>
            운영진이 미리 열어 둔 커넥트라, 참여자가 만든 커넥트와 조금 달라요.
          </p>

          <ul className="pre-notes">
            {NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>

          <button type="button" className="btn btn--block" style={{ marginTop: 20 }} onClick={close}>
            알겠어요
          </button>
        </div>
      </Sheet>
    </>
  );
}
