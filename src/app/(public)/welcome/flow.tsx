'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { ProfileSheet } from '@/components/profile-sheet';
import { updateProfile } from '../me/actions';

type Step = 'welcome' | 'profile' | 'done';

export function WelcomeFlow({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');

    // 스킵하든 저장하든 원래 가려던 곳으로. 초대 링크로 들어왔다면
  // 그 커넥트 상세가 된다(C-14).
  const finish = () => router.replace(next);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--s25)' }}>
      <Modal
        open={step === 'welcome'}
        title="Connect 가입을 환영합니다!"
        body="SLC를 넘나드는 새로운 연결이 지금부터 시작돼요."
        action="계속하기"
        onAction={() => setStep('profile')}
      />

      <ProfileSheet
        open={step === 'profile'}
        onClose={finish}
        onSubmit={updateProfile}
        onDone={() => setStep('done')}
      />

      <Modal
        open={step === 'done'}
        title={'이제 나에게 맞는\nConnect를 탐색해봐요'}
        action="시작하기"
        onAction={finish}
      />
    </div>
  );
}
