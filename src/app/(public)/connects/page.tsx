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
 * 히어로 오른쪽에 띄울 커넥트 하나.
 *
 * 찜이 가장 많은 것을 고른다(요소 문서 1.6.2 — 당일 인기 기준은 찜).
 * 모집 초반에는 아무도 찜하지 않아 고를 것이 없으므로, 그때는
 * 가장 최근에 열린 커넥트를 대신 보여준다. 빈칸으로 두면 히어로
 * 오른쪽이 통째로 비어 화면이 깨져 보인다.
 *
 * 목록에서 빼지 않는다. 예전에 여기 뽑힌 커넥트를 목록에서
 * 제외했더니, 자기가 찜하는 순간 그 카드가 목록에서 사라져
 * 찜을 풀 수조차 없었다.
 */
function pickFeatured(list: Awaited<ReturnType<typeof listConnects>>) {
  const open = list.filter((c) => c.status === 'recruiting');
  if (open.length === 0) return null;

  const top = [...open].sort((a, b) => b.favoriteCount - a.favoriteCount)[0]!;
  if (top.favoriteCount > 0) return { c: top, label: '인기', fresh: false };

  const newest = [...open].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]!;
  return { c: newest, label: '새로 열림', fresh: true };
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
          featured={pickFeatured(list)}
          loggedIn={!!user}
          favoriteIds={[...favIds]}
        />
      </main>
      <TabBar current="/connects" unread={unread} />
    </>
  );
}
