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
/**
 * 상단에 띄울 커넥트 하나.
 *
 * '인기'라고 적어 두고 목록 첫 번째를 그대로 쓰면 최신순 정렬에서는
 * 방금 만들어진 커넥트가 인기로 보인다. 찜이 가장 많은 것을 고르고,
 * 아직 아무도 찜하지 않았다면(모집 초반) 띄우지 않는다.
 */
function pickFeatured(list: Awaited<ReturnType<typeof listConnects>>) {
  const top = [...list]
    .filter((c) => c.status === 'recruiting' && c.favoriteCount > 0)
    .sort((a, b) => b.favoriteCount - a.favoriteCount)[0];
  return top;
}

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
          featured={pickFeatured(list)}
          favoriteIds={[...favIds]}
        />
      </main>
      <TabBar current="/connects" unread={unread} />
    </>
  );
}
