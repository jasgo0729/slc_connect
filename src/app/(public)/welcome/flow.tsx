'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { ProfileSheet } from '@/components/profile-sheet';

type Step = 'welcome' | 'profile' | 'done';

export function WelcomeFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');

  const finish = () => router.replace('/connects');

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
        onSave={() => setStep('done')}
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
