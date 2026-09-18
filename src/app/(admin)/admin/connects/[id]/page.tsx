import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { IconArrowLeft } from '@/components/ui/icon';
import { getConnectRoster } from '@/lib/db/queries/admin-users';
import { getDeletePreview } from '@/lib/db/queries/admin-ops';
import { DeleteConnect } from './delete-connect';
import { trackLabel, isExampleConnect } from '@/lib/connects/options';

export const dynamic = 'force-dynamic';

/**
 * 커넥트 구성원.
 *
 * 누가 들어와 있고 누가 기다리는지를 실명으로 본다.
 * 단톡방을 만들 때(D+10) 이 명단을 그대로 쓴다.
 */
const APP_STATUS: Record<string, string> = {
  pending: '대기 중',
  approved: '승인됨',
  rejected: '거절됨',
  cancelled: '취소됨',
};

const fmt = (d: Date) =>
  d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function AdminConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getConnectRoster(id);
  if (!c) notFound();

  const del = await getDeletePreview(id);

  const pending = c.applicants.filter((a) => a.status === 'pending');
  const past = c.applicants.filter((a) => a.status !== 'pending');
  const short = c.members.length < 4;

  return (
    <main className="shell admin-page">
      <Link href="/admin/connects/all" className="detail-meta" style={{ marginTop: 0 }}>
        <IconArrowLeft size={18} /> 커넥트
      </Link>

      <h1 className="me-title" style={{ marginTop: 8 }}>
        {c.name}
      </h1>
      <p className="create-lede">{c.tagline}</p>

      <div className="chips" style={{ marginTop: 12 }}>
        <StatusBadge status={c.status} />
        <Badge tone="track">{trackLabel(c.track)}</Badge>
        <Badge>{c.campus}</Badge>
        {!c.isPublic && <Badge tone="closed">비공개</Badge>}
        {c.isPreCreated && <Badge tone="review">{isExampleConnect(c) ? '예시' : '사전 개설'}</Badge>}
      </div>

      <div className="admin-cards" style={{ marginTop: 18 }}>
        <div className="admin-card" data-urgent={short}>
          <span className="admin-card-n">
            {c.members.length}/{c.capacity}
          </span>
          <span className="admin-card-label">참여 인원</span>
          {short && <span className="admin-card-hint">4명 미만</span>}
        </div>
        <div className="admin-card">
          <span className="admin-card-n">{pending.length}</span>
          <span className="admin-card-label">대기 중인 신청</span>
        </div>
        <div className="admin-card">
          <span className="admin-card-n">{c.favoriteCount}</span>
          <span className="admin-card-label">찜</span>
        </div>
      </div>

      <h2 className="me-sectitle me-sectitle--gap">참여자</h2>
      <section className="card-block card-block--flush">
        {c.members.length === 0 ? (
          <p className="mini-empty">아직 아무도 없어요.</p>
        ) : (
          <ul className="audit-list">
            {c.members.map((m) => (
              <li key={m.userId}>
                <Link href={`/admin/members/${m.userId}`} className="audit-action">
                  {m.name}
                </Link>
                <span className="audit-detail">
                  {m.cohort} · {m.slc}
                  {m.role === 'leader' && <Badge tone="track">팀장</Badge>}
                </span>
                <span className="audit-meta">
                  {m.residence ?? '거주지 미입력'} · {fmt(m.joinedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pending.length > 0 && (
        <>
          <h2 className="me-sectitle me-sectitle--gap">
            대기 중인 신청 <span className="me-sectitle-sub">{pending.length}</span>
          </h2>
          <section className="card-block card-block--flush">
            <ul className="audit-list">
              {pending.map((a) => (
                <li key={a.userId} className="applicant-row">
                  <div className="applicant-head">
                    <Link href={`/admin/members/${a.userId}`} className="audit-action">
                      {a.name}
                    </Link>
                    <span className="audit-detail">
                      {a.cohort} · {a.slc}
                    </span>
                    <span className="audit-meta">{fmt(a.appliedAt)}</span>
                  </div>
                  {/* 지원서는 팀장이 보는 것이지만, 분쟁이 생기면
                      운영진이 무엇이 오갔는지 확인해야 한다. */}
                  {a.message && <p className="applicant-letter">{a.message}</p>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="me-sectitle me-sectitle--gap">지난 신청</h2>
          <section className="card-block card-block--flush">
            <ul className="audit-list">
              {past.map((a) => (
                <li key={`${a.userId}-${a.appliedAt.getTime()}`}>
                  <Link href={`/admin/members/${a.userId}`} className="audit-action">
                    {a.name}
                  </Link>
                  <span className="audit-detail">{APP_STATUS[a.status] ?? a.status}</span>
                  <span className="audit-meta">{fmt(a.appliedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <h2 className="me-sectitle me-sectitle--gap">관리</h2>

      {/* 지우기 전에 고치는 쪽을 먼저 보여준다. 대부분의 문제는
          내용을 바로잡으면 끝나고, 삭제는 되돌릴 수 없다. */}
      <section className="card-block">
        <div className="danger-zone">
          <div>
            <p className="danger-title">내용 수정</p>
            <p className="danger-sub">팀장이 아니어도 운영진 권한으로 고칠 수 있어요.</p>
          </div>
          <Link href={`/connects/${id}/edit`} className="btn btn--line btn--sm">
            수정하기
          </Link>
        </div>
      </section>

      <section className="card-block" style={{ marginTop: 10 }}>
        <DeleteConnect
          connectId={id}
          name={c.name}
          memberCount={del?.memberCount ?? 0}
          pendingCount={del?.pendingCount ?? 0}
          favoriteCount={del?.favoriteCount ?? 0}
        />
      </section>
    </main>
  );
}
