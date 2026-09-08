import { getPendingConnects } from '@/lib/db/queries/admin';
import { ReviewList } from './review-list';

export const dynamic = 'force-dynamic';

/**
 * J-05 도전 커넥트 확인.
 *
 * C-08에 따라 도전 트랙은 개설 즉시 씨앗판에 오르지 않는다.
 * 여기서 승인해야 모집이 시작되므로, 밀리면 개설자는 자기 커넥트가
 * 사라진 것처럼 느낀다. 모집 기간에는 매일 열어야 하는 화면이다.
 */
export default async function AdminConnectsPage() {
  const items = await getPendingConnects();

  return (
    <main className="shell admin-page">
      <h1 className="me-title">도전 확인</h1>
      <p className="create-lede">
        승인하면 씨앗판에 올라가고, 반려하면 개설자가 사유를 보고 수정할 수 있어요.
      </p>

      <ReviewList items={items} />
    </main>
  );
}
