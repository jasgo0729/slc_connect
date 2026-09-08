import { AUDIENCES, countAudience } from '@/lib/db/queries/admin-ops';
import { NoticeForm } from './notice-form';

export const dynamic = 'force-dynamic';

/**
 * J-04 공지·알림 발송.
 *
 * H-07에 따라 개인 대상 알림은 두지 않는다. 운영 단계의 전달은
 * 팀장을 통하며, 개개인 전체 발송은 팀장 발송과 실질적 차이가 없다.
 */
export default async function AdminNotifyPage() {
  const counts = await Promise.all(AUDIENCES.map((a) => countAudience(a.value)));

  return (
    <main className="shell admin-page">
      <h1 className="me-title">공지</h1>
      <p className="create-lede">
        지금은 앱 안의 알림함에만 쌓입니다. 웹 푸시와 이메일은 붙는 대로 같은 발송에 함께 나갑니다.
      </p>

      <NoticeForm
        audiences={AUDIENCES.map((a, i) => ({ ...a, count: counts[i] ?? 0 }))}
      />
    </main>
  );
}
