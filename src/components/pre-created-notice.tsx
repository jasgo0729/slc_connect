'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sheet } from './ui/sheet';
import { IconSpark } from './ui/icon';

/**
 * 사전 개설 커넥트 안내.
 *
 * 두 종류가 있고 성격이 아예 다르다.
 *
 *   취미  운영진이 미리 열어 둔 실제 커넥트. 개설자가 없어 0명부터
 *         시작하고, 무엇을 할지는 첫 만남에서 정한다. 신청을 받는다.
 *   도전  "도전이 어떤 모습인지" 보여주려고 올려 둔 예시.
 *         신청을 받지 않고, 대신 같은 커넥트를 직접 만들도록 안내한다.
 *
 * 한 번 보고 나면 그 세션 동안 다시 띄우지 않는다. 목록을 오가며
 * 여러 커넥트를 보는 동안 같은 안내가 계속 뜨면 읽지 않게 된다.
 */
const PRE_NOTES = [
  '개설자가 없어 인원이 0명부터 시작해요.',
  '무엇을 어떻게 할지는 첫 만남에서 팀원들과 자율적으로 정해요.',
  '같은 주제가 인사캠과 자과캠에 각각 있어요. 활동 캠퍼스를 확인하고 지원해 주세요.',
  '최소 인원 4명을 채우지 못하면 팀이 결성되지 않을 수 있어요. 함께할 사람이 있다면 초대 링크를 공유해 주세요.',
];

const EXAMPLE_NOTES = [
  "이 커넥트는 학생회가 모집 시작 전에 미리 올려 둔 '예시 커넥트'입니다. 도전 트랙이 어떤 모습인지 보여드리려고 만든 것이라 이 커넥트에는 신청하실 수 없습니다.",
  '대신 아래 설명을 그대로 복사해 같은 커넥트를 직접 개설하셔도 되고, 마음에 드는 부분만 골라 참고하셔도 됩니다.',
];

export function PreCreatedNotice({
  isExample = false,
  description,
}: {
  isExample?: boolean;
  /** 예시 커넥트에서 복사해 갈 활동 소개. */
  description?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // 예시와 사전 개설은 안내가 달라 본 기록도 따로 남긴다.
  const seenKey = isExample ? 'example-notice-seen' : 'pre-created-notice-seen';

  useEffect(() => {
    try {
      if (sessionStorage.getItem(seenKey)) return;
    } catch {
      // 시크릿 모드 등에서 막힐 수 있다. 그때는 그냥 띄운다.
    }
    setOpen(true);
  }, [seenKey]);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(seenKey, '1');
    } catch {
      // 저장하지 못해도 화면은 닫힌다.
    }
  };

  const copy = async () => {
    if (!description) return;
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 내용을 복사해 주세요', description);
    }
  };

  const notes = isExample ? EXAMPLE_NOTES : PRE_NOTES;

  return (
    <>
      <button type="button" className="pre-badge" onClick={() => setOpen(true)}>
        <IconSpark size={13} />
        {isExample ? '예시 커넥트' : '사전 개설 커넥트'}
      </button>

      <Sheet open={open} onClose={close} labelledBy="pre-title">
        <div className="sheet--form">
          <div className="pre-icon" aria-hidden="true">
            <IconSpark size={22} />
          </div>

          <h2
            className="sheet-heading"
            id="pre-title"
            style={{ paddingRight: 0, textAlign: 'center' }}
          >
            {isExample ? '예시 커넥트예요' : '사전 개설 커넥트예요'}
          </h2>
          <p className="sheet-sub" style={{ textAlign: 'center' }}>
            {isExample
              ? '신청은 받지 않지만, 같은 커넥트를 직접 만들 수 있어요.'
              : '운영진이 미리 열어 둔 커넥트라, 참여자가 만든 커넥트와 조금 달라요.'}
          </p>

          <ul className="pre-notes">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>

          {isExample ? (
            <div className="pre-actions">
              {description && (
                <button type="button" className="btn btn--line" onClick={copy}>
                  {copied ? '복사했어요' : '설명 복사'}
                </button>
              )}
              <Link href="/connects/new" className="btn">
                커넥트 만들러 가기
              </Link>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--block"
              style={{ marginTop: 20 }}
              onClick={close}
            >
              알겠어요
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}
