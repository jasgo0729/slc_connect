'use client';

import { useState, useTransition } from 'react';
import { setInstagramAction } from '@/app/(public)/connects/[id]/actions';
import { instagramHandle, instagramUrl } from '@/lib/connects/instagram';
import { IconCamera } from './ui/icon';

/**
 * 커넥트 인스타그램(시안 31·32).
 *
 * 팀장에게만 '수정'이 보인다. 다만 보이는 것은 편의일 뿐이고
 * 실제 차단은 서버 액션 안에서 한다(규칙 6).
 *
 * 입력은 controlled 로 두고 저장 결과를 서버가 돌려준 값으로
 * 덮는다. React 19 는 폼 액션이 끝나면 uncontrolled 입력을
 * 스스로 비우기 때문에, 검증에 걸렸을 때 적어 둔 것이 사라진다.
 * 여기서는 실패해도 입력을 그대로 남겨 고쳐서 다시 낼 수 있게 한다.
 */
export function InstagramField({
  connectId,
  value,
  canEdit,
}: {
  connectId: string;
  value: string | null;
  /** 팀장 여부. 화면 편의용. */
  canEdit: boolean;
}) {
  const [saved, setSaved] = useState(value ?? '');
  const [draft, setDraft] = useState(value ?? '');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await setInstagramAction(connectId, draft);
      if (res.error) {
        setError(res.error);
        return;
      }
      const next = res.value ?? '';
      setSaved(next);
      setDraft(next);
      setEditing(false);
    });
  };

  const cancel = () => {
    setDraft(saved);
    setError(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="ig-edit">
        <label className="sr-only" htmlFor="ig-input">
          인스타그램 아이디
        </label>
        <div className="ig-inputrow">
          <span className="ig-at" aria-hidden="true">
            @
          </span>
          <input
            id="ig-input"
            className="ig-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="아이디 또는 주소"
            autoComplete="off"
            disabled={pending}
          />
        </div>

        {error && (
          <p className="ig-error" role="alert">
            {error}
          </p>
        )}

        <p className="field-hint">비우고 저장하면 지워져요.</p>

        <div className="ig-actions">
          <button type="button" className="btn btn--line btn--sm" onClick={cancel} disabled={pending}>
            취소
          </button>
          <button type="button" className="btn btn--sm" onClick={save} disabled={pending}>
            {pending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    );
  }

  // 아직 적지 않은 팀. 팀장이 아니면 이 구역 자체를 숨긴다 —
  // 남의 팀에 "없음"만 덩그러니 보여 줄 이유가 없다.
  if (!saved) {
    if (!canEdit) return null;
    return (
      <button type="button" className="ig-empty" onClick={() => setEditing(true)}>
        <IconCamera size={16} />
        <span>인스타그램 계정 추가하기</span>
      </button>
    );
  }

  return (
    <div className="ig-box">
      <a
        className="ig-handle"
        href={instagramUrl(saved)}
        target="_blank"
        rel="noreferrer noopener"
      >
        <IconCamera size={16} />
        {instagramHandle(saved)}
      </a>

      {canEdit && (
        <button type="button" className="textbtn ig-editbtn" onClick={() => setEditing(true)}>
          수정
        </button>
      )}
    </div>
  );
}
