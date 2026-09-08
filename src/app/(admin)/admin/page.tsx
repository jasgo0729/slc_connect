import Link from 'next/link';
import { getAdminCounts } from '@/lib/db/queries/admin';
import {
  getMemberStats,
  getRecentAudit,
  getShortConnects,
  getStaleConnects,
} from '@/lib/db/queries/admin-ops';

export const dynamic = 'force-dynamic';

/**
 * 운영 대시보드 — "오늘 처리할 것".
 *
 * 크론을 두지 않기로 했으므로(자동 실행이 조용히 실패하면 아무도 모른다)
 * 처리할 일을 조회 시점에 계산해 보여준다. 판단은 사람이, 계산은 시스템이.
 *
 * 숫자가 0이면 흐리게 둔다. 매일 여는 화면에서 할 일이 있는 곳만
 * 눈에 띄어야 한다.
 */
function Card({
  href,
  n,
  label,
  hint,
}: {
  href?: string;
  n: number;
  label: string;
  hint?: string;
}) {
  const body = (
    <>
      <span className="admin-card-n">{n}</span>
      <span className="admin-card-label">{label}</span>
      {hint && <span className="admin-card-hint">{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="admin-card" data-urgent={n > 0}>
      {body}
    </Link>
  ) : (
    <div className="admin-card">{body}</div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  'connect.approve': '도전 승인',
  'connect.reject': '도전 반려',
  'connect.capacity': '정원 조정',
  'notice.send': '공지 발송',
  'season.confirm': '팀 일괄 확정',
};

export default async function AdminHome() {
  const [counts, stats, short, stale, audit] = await Promise.all([
    getAdminCounts(),
    getMemberStats(),
    getShortConnects(),
    getStaleConnects(),
    getRecentAudit(8),
  ]);

  return (
    <main className="shell admin-page">
      <h1 className="me-title">오늘 처리할 것</h1>

      <div className="admin-cards">
        <Card
          href="/admin/connects"
          n={counts.pendingConnects}
          label="도전 확인 대기"
          hint="승인해야 씨앗판에 올라가요"
        />
        <Card
          href="/admin/members"
          n={short.length}
          label="인원 미달 커넥트"
          hint="4명 미만이면 활동을 인정받지 못해요"
        />
        <Card
          href="/admin/connects/all"
          n={stale.length}
          label="신청 0명으로 5일 지남"
          hint="D-13 씨앗판 정리 대상"
        />
      </div>

      <h2 className="me-sectitle me-sectitle--gap">현황</h2>
      <div className="admin-cards">
        <Card n={counts.connects} label="열려 있는 커넥트" />
        <Card
          n={stats.joined}
          label="가입한 인원"
          hint={`명단 ${stats.rosterTotal}명 중 ${Math.round((stats.joined / Math.max(stats.rosterTotal, 1)) * 100)}%`}
        />
        <Card
          n={stats.inConnect}
          label="커넥트 참여 인원"
          hint={`미소속 ${stats.joined - stats.inConnect}명`}
        />
      </div>

      {/* 되돌리기 어려운 조작이 언제 누구에 의해 있었는지 남긴다. */}
      <h2 className="me-sectitle me-sectitle--gap">최근 운영 기록</h2>
      <section className="card-block card-block--flush">
        {audit.length === 0 ? (
          <p className="mini-empty">아직 기록이 없어요.</p>
        ) : (
          <ul className="audit-list">
            {audit.map((a) => (
              <li key={a.id}>
                <span className="audit-action">{ACTION_LABEL[a.action] ?? a.action}</span>
                <span className="audit-detail">
                  {(a.detail as { name?: string; count?: number; connects?: number })?.name ??
                    (a.detail as { count?: number })?.count ??
                    (a.detail as { connects?: number })?.connects ??
                    ''}
                </span>
                <span className="audit-meta">
                  {a.actorName} · {a.createdAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
