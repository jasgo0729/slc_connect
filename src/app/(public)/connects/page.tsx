import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';
import { listConnects } from '@/lib/db/queries/connects';
import { getFavoriteIds } from '@/lib/db/queries/favorites';
import { Board } from './board';

export const dynamic = 'force-dynamic';

/**
 * B-01 씨앗판.
 *
 * 로그인 없이 목록·필터·정렬까지 열어 둔다. 로그인해야 볼 수 있다면
 * 로그인할 이유를 먼저 줘야 한다. 상세(B-02)부터는 참여자 이름과
 * 프로필이 나오므로 거기서 막는다.
 */
export default async function ConnectsPage() {
  const [user, list] = await Promise.all([getCurrentUser(), listConnects({})]);
  const favIds = user ? await getFavoriteIds(user.id) : new Set<string>();
  const unread = user ? await countUnread(user.id) : 0;

  return (
    <>
      <AppBar current="/connects" user={user ? { id: user.id, name: user.name } : null} callbackUrl="/connects" />
      <main className="page">
        <Board
          items={list}
          loggedIn={!!user}
          favoriteIds={[...favIds]}
        />
      </main>
      <TabBar current="/connects" unread={unread} />
    </>
  );
}
