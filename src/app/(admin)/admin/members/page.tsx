import { getMemberStats, getShortConnects, getUnassignedMembers } from '@/lib/db/queries/admin-ops';
import { trackLabel } from '@/lib/connects/options';

export const dynamic = 'force-dynamic';

/**
 * J-02 인원 관리 · D-14 인원 흡수 대상 추출.
 *
 * 미달 커넥트와 미소속 인원을 한 화면에 나란히 둔다. 이 둘을 맞붙이는
 * 것이 D+8~D+9에 실제로 하는 일이고, 화면을 나누면 두 목록을
 * 번갈아 보며 손으로 대조하게 된다.
 *
 * 실제 연락은 사람이 한다. 웹은 목록을 뽑아 주는 데까지다.
 */
export default async function AdminMembersPage() {
  const [stats, short, unassigned] = await Promise.all([
    getMemberStats(),
    getShortConnects(),
    getUnassignedMembers(),
  ]);

  const rate = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

  return (
    <main className="shell admin-page">
      <h1 className="me-title">인원</h1>

      <div className="admin-cards">
        <div className="admin-card">
          <span className="admin-card-n">{stats.joined}</span>
          <span className="admin-card-label">가입</span>
          <span className="admin-card-hint">
            명단 {stats.rosterTotal}명 중 {rate(stats.joined, stats.rosterTotal)}%
          </span>
        </div>
        <div className="admin-card">
          <span className="admin-card-n">{stats.inConnect}</span>
          <span className="admin-card-label">커넥트 참여</span>
          <span className="admin-card-hint">가입자 중 {rate(stats.inConnect, stats.joined)}%</span>
        </div>
        <div className="admin-card" data-urgent={unassigned.length > 0}>
          <span className="admin-card-n">{unassigned.length}</span>
          <span className="admin-card-label">미소속</span>
          <span className="admin-card-hint">아직 어느 커넥트에도 없어요</span>
        </div>
      </div>

      <h2 className="me-sectitle me-sectitle--gap">가입 현황</h2>
      <section className="card-block">
        {[...stats.byCohort, ...stats.byCampus].map((g, i) => (
          <div key={`${g.label}-${i}`} className="rate-row">
            <span className="rate-label">{g.label}</span>
            <span className="rate-bar">
              <span style={{ width: `${rate(g.joined, g.roster)}%` }} />
            </span>
            <span className="rate-n">
              {g.joined}/{g.roster}
            </span>
          </div>
        ))}
      </section>

      {/* D-14 — 이 둘을 맞붙이는 것이 실제 작업이다 */}
      <h2 className="me-sectitle me-sectitle--gap">
        인원이 모자란 커넥트 <span className="me-sectitle-sub">{short.length}곳</span>
      </h2>
      <section className="card-block card-block--flush">
        {short.length === 0 ? (
          <p className="mini-empty">4명 미만인 커넥트가 없어요.</p>
        ) : (
          <ul className="audit-list">
            {short.map((c) => (
              <li key={c.id}>
                <span className="audit-action">{c.name}</span>
                <span className="audit-detail">
                  {trackLabel(c.track)} ·{' '}
                  {c.campus === '인문사회' ? '인사캠' : c.campus === '자연과학' ? '자과캠' : '공통'}
                </span>
                <span className="audit-meta">
                  {c.memberCount}/{c.capacity}명
                  {c.pendingCount > 0 && ` · 대기 ${c.pendingCount}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="me-sectitle me-sectitle--gap">
        커넥트 미소속 <span className="me-sectitle-sub">{unassigned.length}명</span>
      </h2>
      <section className="card-block card-block--flush">
        {unassigned.length === 0 ? (
          <p className="mini-empty">모두 어딘가에 속해 있어요.</p>
        ) : (
          <ul className="audit-list">
            {unassigned.map((m) => (
              <li key={m.id}>
                <span className="audit-action">{m.name}</span>
                <span className="audit-detail">
                  {m.cohort} · {m.slc} ·{' '}
                  {m.campus === '인문사회' ? '인사캠' : '자과캠'}
                </span>
                <span className="audit-meta">
                  {m.appliedCount > 0 ? `신청 ${m.appliedCount}회` : '신청 없음'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
