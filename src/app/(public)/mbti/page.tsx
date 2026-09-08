import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { ComingSoon } from '@/components/coming-soon';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getCurrentUser();
  const unread = user ? await countUnread(user.id) : 0;

  return (
    <>
      <AppBar
        current="/mbti"
        user={user ? { id: user.id, name: user.name } : null}
        callbackUrl="/mbti"
      />
      <ComingSoon when="모집 시작에 맞춰 열려요" title="Connect-MBTI" body="12문항으로 내 성향을 알아보고 어울리는 커넥트를 추천받아요." />
      <TabBar current="/mbti" unread={unread} />
    </>
  );
}
