import { getConfirmPreview } from '@/lib/db/queries/admin-ops';
import { ConfirmPanel } from './confirm-panel';

export const dynamic = 'force-dynamic';

/**
 * D-16 · J-08 팀 확정 일괄 처리.
 *
 * 모집 마감일에 한 번 누르는 버튼이다. D-05 마감과 D-16 확정이
 * 같은 조작이라 중간 상태를 두지 않는다.
 *
 * 되돌릴 수 없으므로 무엇이 바뀌는지 먼저 보여준다.
 */
export default async function AdminConfirmPage() {
  const p = await getConfirmPreview();
  return (
    <main className="shell admin-page">
      <h1 className="me-title">팀 확정</h1>
      <p className="create-lede">
        모집을 끝내고 모든 커넥트를 확정합니다. 되돌릴 수 없어요.
      </p>
      <ConfirmPanel preview={p} />
    </main>
  );
}
