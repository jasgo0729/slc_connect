import { redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';
import { getMyConnectMbti } from '@/lib/db/queries/me';
import { RecommendFlow } from './recommend-flow';

export const dynamic = 'force-dynamic';

/**
 * E-01 추천.
 *
 * 로그인이 필요하다 — 프로필과 Connect-MBTI가 재료이고,
 * 호출 제한(E-09)도 사람 단위로 걸어야 한다.
 */
export default async function RecommendPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=%2Frecommend');

  const [unread, mbtiCode] = await Promise.all([
    countUnread(user.id),
    getMyConnectMbti(user.id),
  ]);

  // 재료가 하나도 없으면 결과가 뻔해진다. 들어올 때 한 번 물어본다.
  const needsProfile = !mbtiCode && !user.bio && !user.residence && !user.interests;

  return (
    <>
      <AppBar current="/recommend" user={{ id: user.id, name: user.name }} />
      <RecommendFlow needsProfile={needsProfile} />
      <TabBar current="/recommend" unread={unread} />
    </>
  );
}
