import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { IconArrowLeft } from '@/components/ui/icon';
import { getUserDetail } from '@/lib/db/queries/admin-users';
import { trackLabel } from '@/lib/connects/options';
import { findConnectMbti } from '@/lib/connects/mbti';
import { getCurrentUser } from '@/lib/auth/session';
import { RoleToggle } from './role-toggle';

export const dynamic = 'force-dynamic';

/**
 * 개인 상세.
 *
 * "제가 신청했는데 안 보여요" 같은 문의를 받았을 때 여는 화면이다.
 * 신청 이력이 상태와 시각까지 남아 있어야 무엇이 어긋났는지 말할 수 있다.
 */
const APP_STATUS: Record<string, string> = {
  pending: '대기 중',
  approved: '승인됨',
  rejected: '거절됨',
  cancelled: '취소됨',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="kv-key">{label}</span>
      <span className="kv-val">{value}</span>
    </div>
  );
}

const fmt = (d: Date | null) =>
  d
    ? d.toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUserDetail(id);
  if (!u) notFound();

  const mbti = findConnectMbti(u.connectMbti);
  const me = await getCurrentUser();

  return (
    <main className="shell admin-page">
      <Link href="/admin/members/all" className="detail-meta" style={{ marginTop: 0 }}>
        <IconArrowLeft size={18} /> 가입자
      </Link>

      <h1 className="me-title" style={{ marginTop: 8 }}>
        {u.name}
        {u.role === 'admin' && <span className="utable-tag">운영</span>}
      </h1>
      <p className="create-lede">
        {u.cohort} · {u.slc} · {u.campus} · {u.studentNo}
      </p>

      <h2 className="me-sectitle me-sectitle--gap">계정</h2>
      <section className="card-block">
        <Row label="이메일" value={u.email} />
        <Row label="전공" value={u.major ?? '—'} />
        <Row label="학번 결속" value={fmt(u.boundAt)} />
        <Row label="가입" value={fmt(u.createdAt)} />
        <Row label="최근 접속" value={fmt(u.lastLoginAt)} />
        {/* 검사하지 않고 기록만 하는 값. 분쟁 시 근거가 된다. */}
        {u.googleHd && <Row label="구글 도메인" value={u.googleHd} />}
        {u.emailBouncedAt && (
          <Row label="메일 반송" value={`${fmt(u.emailBouncedAt)} 이후 발송 중단`} />
        )}
      </section>

      <h2 className="me-sectitle me-sectitle--gap">프로필</h2>
      <section className="card-block">
        <Row label="한 줄 소개" value={u.bio ?? '—'} />
        <Row label="방학 중 거주지" value={u.residence ?? '—'} />
        <Row label="관심 있는 것" value={u.interests ?? '—'} />
        <Row label="MBTI" value={u.mbtiType ?? '—'} />
        <Row
          label="Connect-MBTI"
          value={mbti ? `${mbti.emoji} ${mbti.title} (${mbti.code})` : '미응시'}
        />
        <Row label="찜한 커넥트" value={`${u.favoriteCount}개`} />
      </section>

      <h2 className="me-sectitle me-sectitle--gap">
        소속 커넥트 <span className="me-sectitle-sub">{u.memberships.length}</span>
      </h2>
      <section className="card-block card-block--flush">
        {u.memberships.length === 0 ? (
          <p className="mini-empty">아직 어느 커넥트에도 속하지 않았어요.</p>
        ) : (
          <ul className="audit-list">
            {u.memberships.map((m) => (
              <li key={m.connectId}>
                <Link href={`/admin/connects/${m.connectId}`} className="audit-action">
                  {m.name}
                </Link>
                <span className="audit-detail">
                  {trackLabel(m.track)}
                  {m.role === 'leader' && <Badge tone="track">팀장</Badge>}
                </span>
                <span className="audit-meta">{fmt(m.joinedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="me-sectitle me-sectitle--gap">
        신청 이력 <span className="me-sectitle-sub">{u.applications.length}</span>
      </h2>
      <section className="card-block card-block--flush">
        {u.applications.length === 0 ? (
          <p className="mini-empty">신청한 적이 없어요.</p>
        ) : (
          <ul className="audit-list">
            {u.applications.map((a) => (
              <li key={`${a.connectId}-${a.appliedAt.getTime()}`}>
                <Link href={`/admin/connects/${a.connectId}`} className="audit-action">
                  {a.name}
                </Link>
                <span className="audit-detail">{APP_STATUS[a.status] ?? a.status}</span>
                <span className="audit-meta">
                  {fmt(a.appliedAt)}
                  {a.decidedAt && ` → ${fmt(a.decidedAt)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <h2 className="me-sectitle me-sectitle--gap">권한</h2>
      <section className="card-block">
        <div className="kv">
          <span className="kv-key">현재</span>
          <span className="kv-val">{u.role === 'admin' ? '관리자' : '일반'}</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <RoleToggle
            userId={u.userId}
            name={u.name}
            isAdmin={u.role === 'admin'}
            isSelf={me?.id === u.userId}
          />
        </div>
      </section>
    </main>
  );
}
