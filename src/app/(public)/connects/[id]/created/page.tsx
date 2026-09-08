import { notFound, redirect } from 'next/navigation';
import { ResultScreen } from '@/components/result-screen';
import { InviteLinkBox } from '@/components/invite-link-box';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectDetail } from '@/lib/db/queries/connect-detail';

export const dynamic = 'force-dynamic';

/**
 * 개설 직후 안내 (C-07·C-08·C-09).
 *
 * 정량 트랙은 즉시 등록되므로 초대 링크를 바로 준다 — 개설한 순간
 * 인원이 팀장 한 명이라, 다음에 할 일은 사람을 모으는 것뿐이다.
 * 정성 트랙은 확인 대기 상태라 링크를 줘도 쓸 수 없다.
 *
 * 반려된 커넥트도 이 화면으로 온다. 사유를 보고 수정하러 가는 것이
 * 다음 행동이기 때문이다(C-09).
 */
interface Props {
  params: Promise<{ id: string }>;
}

export default async function CreatedPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${id}/created`)}`);

  const c = await getConnectDetail(id, user.id);
  if (!c) notFound();

  // 개설 결과는 팀장에게만 의미가 있다.
  if (!c.viewer.isLeader) redirect(`/connects/${id}`);

  // C-09 반려. 사유를 보고 수정 후 재신청한다.
  if (c.status === 'rejected') {
    return (
      <ResultScreen
        tone="reject"
        title="아쉽지만 반려되었어요"
        body={
          <>
            아래 사유를 확인하고 내용을 수정한 뒤
            <br />
            다시 신청해주세요.
          </>
        }
        detail={{
          label: '반려 사유',
          text: c.rejectionReason ?? '운영진에게 문의해 주세요.',
        }}
        actions={[{ href: `/connects/${id}/edit`, label: '수정하러 가기' }]}
      />
    );
  }

  // C-08 정성 트랙은 확인을 기다린다.
  if (c.status === 'pending_review') {
    return (
      <ResultScreen
        tone="wait"
        title="신청이 완료되었습니다!"
        body={
          <>
            TF에서 주제 적정성을 확인한 후
            <br />
            빠르게 승인해 드릴게요.
          </>
        }
        actions={[{ href: '/me', label: '마이페이지에서 확인하기' }]}
      />
    );
  }

  // C-07 정량 트랙은 바로 열린다.
  return (
    <ResultScreen
      tone="success"
      title="커넥트 개설 완료!"
      body={
        <>
          발급된 초대 링크를 복사하여
          <br />
          팀원들을 모아보세요.
        </>
      }
      actions={[{ href: `/connects/${id}`, label: '완료' }]}
    >
      <InviteLinkBox token={c.inviteToken} />
    </ResultScreen>
  );
}
