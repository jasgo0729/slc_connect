'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';

/**
 * 모집이 끝난 뒤 개설 화면에 들어온 경우.
 *
 * 폼을 띄워 두고 제출할 때 거절하지 않는다. 다 적고 나서 "안 된다"는
 * 말을 들으면 그 시간이 통째로 버려진다. 들어온 순간 알린다.
 *
 * 배경을 눌러도 닫히지 않는다(Modal 의 기본). 여기서는 닫아도
 * 할 수 있는 일이 없고, 뒤에 남은 화면에는 빈 자리뿐이다.
 */
export function ClosedNotice({ deadline }: { deadline: string | null }) {
  const router = useRouter();

  return (
    <Modal
      open
      tone="error"
      title={'모집이 끝났어요'}
      body={
        deadline
          ? `${deadline}에 모집이 마감돼 새 커넥트를 만들 수 없어요. 이미 만들어진 커넥트는 씨앗판에서 볼 수 있어요.`
          : '모집이 마감돼 새 커넥트를 만들 수 없어요. 이미 만들어진 커넥트는 씨앗판에서 볼 수 있어요.'
      }
      action="씨앗판 둘러보기"
      onAction={() => router.push('/connects')}
      secondary={{ label: '내 커넥트 보기', onClick: () => router.push('/me') }}
    />
  );
}
