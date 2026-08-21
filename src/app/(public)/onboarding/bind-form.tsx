'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal } from '@/components/ui/modal';
import { ProfileSheet } from '@/components/profile-sheet';
import { submitBinding } from './actions';
import type { BindFormState } from './actions';

const initial: BindFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--block" disabled={pending} style={{ marginTop: 24 }}>
      {pending ? '확인하는 중…' : '인증하기'}
    </button>
  );
}

export function BindForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(submitBinding, initial);
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      <form action={action} className="auth-form">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="field">
          <label className="field-label" htmlFor="name">
            이름
          </label>
          <input
            id="name"
            name="name"
            className="input"
            autoComplete="name"
            placeholder="이름을 입력해주세요"
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="studentNo">
            학번
          </label>
          <input
            id="studentNo"
            name="studentNo"
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="학번을 입력해주세요"
            required
          />
        </div>

        <SubmitButton />
      </form>

      {/* 실패는 팝업으로 알린다. 폼 아래 문구보다 눈에 띄고,
          확인을 눌러야 사라지므로 놓치지 않는다. */}
      <Modal
        open={Boolean(state.error) && !dismissed}
        tone="error"
        title="이름과 학번을 확인해주세요"
        body={state.error}
        action="확인"
        onAction={() => setDismissed(true)}
      />
    </>
  );
}
