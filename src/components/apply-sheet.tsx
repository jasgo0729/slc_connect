'use client';

import { useState } from 'react';
import { Sheet } from './ui/sheet';

/**
 * 정성 트랙 지원서.
 *
 * 팀장이 승인 여부를 판단할 유일한 재료다. 정량 트랙은 즉시 참여라
 * 이 시트를 거치지 않는다 — 자주 만나는 것이 목표인 팀에서
 * 지원서를 요구하면 진입장벽만 생긴다.
 *
 * 비워 둔 채 제출할 수 있게 두었다. 못 쓰게 막으면 신청 자체를
 * 포기하는 쪽이 생기고, 팀장은 어차피 프로필을 함께 본다.
 */
const MAX = 200;

export function ApplySheet({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  pending: boolean;
}) {
  const [text, setText] = useState('');

  return (
    <Sheet open={open} onClose={onClose} labelledBy="apply-title">
      <div className="sheet--form">
        <h2 className="sheet-heading" id="apply-title" style={{ paddingRight: 0 }}>
          팀장에게 나를 어필해 보세요
        </h2>
        <p className="sheet-sub">이 커넥트에 참여하고 싶은 이유를 자유롭게 적어주세요</p>

        <div className="field" style={{ marginTop: 18 }}>
          <label className="sr-only" htmlFor="apply-msg">
            지원 내용
          </label>
          <textarea
            id="apply-msg"
            className="input textarea"
            rows={5}
            maxLength={MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예) 이 공모전에서 기획 및 자료 조사를 맡아 수상까지 이끌어보고 싶습니다!"
          />
          <p className="counter counter--under">
            {text.length}/{MAX}
          </p>
        </div>

        <button
          type="button"
          className="btn btn--block"
          style={{ marginTop: 8 }}
          disabled={pending}
          onClick={() => onSubmit(text)}
        >
          {pending ? '제출하는 중…' : '제출하기'}
        </button>
      </div>
    </Sheet>
  );
}
