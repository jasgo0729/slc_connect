import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';
import { MbtiTest } from './mbti-test';

export const dynamic = 'force-dynamic';

/**
 * F-02 Connect-MBTI.
 *
 * 비로그인도 응시할 수 있다. 홍보 경로라 로그인부터 요구하면
 * 인스타그램에서 넘어온 사람이 그 자리에서 이탈한다.
 * 결과 저장만 로그인한 사람에게 일어난다(A-07).
 */
export default async function MbtiPage() {
  const user = await getCurrentUser();
  const unread = user ? await countUnread(user.id) : 0;

  return (
    <>
      <AppBar
        current="/mbti"
        user={user ? { id: user.id, name: user.name } : null}
        callbackUrl="/mbti"
      />
      <MbtiTest loggedIn={Boolean(user)} />
      <TabBar current="/mbti" unread={unread} />
    </>
  );
}
