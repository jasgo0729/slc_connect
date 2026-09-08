'use client';

import { useState } from 'react';
import { ProfileSheet } from '@/components/profile-sheet';
import type { ProfileValues } from '@/components/profile-sheet';
import { updateProfile } from './actions';

/** 마이페이지의 [프로필 수정하기]. 온보딩과 같은 폼을 연다. */
export function ProfileEditor({ initial }: { initial: ProfileValues }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn--line btn--sm" onClick={() => setOpen(true)}>
        프로필 수정하기
      </button>

      <ProfileSheet
        open={open}
        onClose={() => setOpen(false)}
        initial={initial}
        onSubmit={updateProfile}
        onDone={() => setOpen(false)}
        submitLabel="저장하기"
        title="내 프로필 수정"
        showSkip={false}
      />
    </>
  );
}
