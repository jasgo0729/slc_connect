import { notFound, redirect } from 'next/navigation';
import { ResultScreen } from '@/components/result-screen';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectDetail } from '@/lib/db/queries/connect-detail';
import { rejectLabel } from '@/lib/connects/reject-reasons';
import { SEASON_KEYS, getSeasonConfig } from '@/lib/db/queries/season';

/**
 * 단톡방이 열리는 날.
 *
 * 날짜를 코드에 박지 않는다. 일정이 바뀌면 배포해야 하고, 그때
 * 이 화면 하나를 기억해 내는 사람이 없다. 운영 화면에서 고친다.
 */
function chatOpenText(activityStart?: string): React.ReactNode {
  if (!activityStart) {
    return (
      <>
        곧 커넥트 카카오톡 톡방이 만들어집니다.
        <br />
        그때 커넥트 사람들을 만나봐요!
      </>
    );
  }
  const [, m, d] = activityStart.split('-');
  return (
    <>
      {Number(m)}월 {Number(d)}일 커넥트 카카오톡 톡방이 만들어집니다.
      <br />
      그때 커넥트 사람들을 만나봐요!
    </>
  );
}

export const dynamic = 'force-dynamic';

/**
 * 신청 결과 (D-01·D-02·D-03).
 *
 * 화면 종류를 쿼리로 받지 않고 현재 상태에서 유도한다.
 * URL을 손으로 바꿔 "가입 완료"를 볼 수 있으면 안 되고,
 * 알림을 눌러 들어왔을 때도 그 사이 바뀐 결과를 보여줘야 한다.
 */
interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplyResultPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${id}/result`)}`);

  const c = await getConnectDetail(id, user.id);
  if (!c) notFound();

  const season = await getSeasonConfig();

  // 참여가 확정된 경우. 정량 트랙은 신청과 동시에 여기로 온다.
  if (c.viewer.isMember && !c.viewer.isLeader) {
    return (
      <ResultScreen
        tone="celebrate"
        title="가입이 완료되었습니다!"
        body={chatOpenText(season[SEASON_KEYS.activityStart.key])}
        actions={[{ href: `/connects/${id}`, label: '확인' }]}
      />
    );
  }

  if (c.viewer.application === 'pending') {
    return (
      <ResultScreen
        tone="wait"
        title="신청서가 전달되었습니다!"
        body={
          <>
            팀장이 승인하면 웹 알림 및 이메일로
            <br />
            결과를 알려드릴게요.
          </>
        }
        actions={[{ href: '/me', label: '마이페이지에서 확인하기' }]}
      />
    );
  }

  if (c.viewer.application === 'rejected') {
    // 거절은 막다른 길이 되기 쉽다. 다음에 할 수 있는 것을 둘 준다.
    return (
      <ResultScreen
        tone="reject"
        title="아쉽지만 함께하지 못했어요"
        body={rejectLabel(c.viewer.rejectReason)}
        actions={[
          { href: '/connects', label: '다른 커넥트 둘러보기', variant: 'line' },
          { href: '/connects/new', label: '커넥트 개설하기', variant: 'line' },
        ]}
      />
    );
  }

  // 신청 이력이 없으면 볼 결과가 없다.
  redirect(`/connects/${id}`);
}
