import { redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';
import { getMyConnectMbti } from '@/lib/db/queries/me';
import { RecommendForm } from './recommend-form';

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

  const hasProfile = Boolean(user.bio || user.interests || (user.preferredDays ?? []).length > 0);

  return (
    <>
      <AppBar current="/recommend" user={{ id: user.id, name: user.name }} />

      <main className="page shell reco">
        <h1 className="create-title">키워드로 커넥트 찾기</h1>
        <p className="create-lede">
          {mbtiCode
            ? 'Connect-MBTI 결과와 프로필을 함께 보고 골라 드릴게요.'
            : '프로필을 보고 골라 드릴게요. 무엇을 할지 정하지 않았어도 괜찮습니다.'}
        </p>

        <RecommendForm hasMbti={Boolean(mbtiCode)} hasProfile={hasProfile} />
      </main>

      <TabBar current="/recommend" unread={unread} />
    </>
  );
}
