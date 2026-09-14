import Link from 'next/link';
import { getNotJoined, getUserFacets, listUsers } from '@/lib/db/queries/admin-users';
import { UserFilters } from './user-filters';

export const dynamic = 'force-dynamic';

/**
 * J-02 가입자 목록.
 *
 * 문의가 들어왔을 때 그 사람이 어디에 속해 있는지 바로 찾는 화면이다.
 * 관리자는 가린 이름이 아니라 실명을 본다 — "김OO님"으로는
 * 어느 김OO인지 가릴 수 없다.
 */
interface Props {
  searchParams: Promise<{
    q?: string;
    cohort?: string;
    campus?: string;
    slc?: string;
    belonging?: string;
    tab?: string;
  }>;
}

const CAMPUS_SHORT: Record<string, string> = { 인문사회: '인사캠', 자연과학: '자과캠' };

export default async function AdminAllMembersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const showNotJoined = sp.tab === 'notjoined';

  const [facets, list, notJoined] = await Promise.all([
    getUserFacets(),
    showNotJoined ? Promise.resolve([]) : listUsers(sp),
    getNotJoined(),
  ]);

  return (
    <main className="shell admin-page">
      <h1 className="me-title">가입자</h1>

      <div className="chips" style={{ marginTop: 14 }}>
        <Link href="/admin/members/all" className="chip" aria-pressed={!showNotJoined}>
          가입함
        </Link>
        <Link
          href="/admin/members/all?tab=notjoined"
          className="chip"
          aria-pressed={showNotJoined}
        >
          아직 안 들어옴 {notJoined.length}
        </Link>
      </div>

      {showNotJoined ? (
        <>
          <p className="create-lede" style={{ marginTop: 14 }}>
            명단에는 있는데 아직 로그인하지 않은 사람이에요. 모집 독려의 1차 대상입니다.
          </p>
          <section className="card-block card-block--flush">
            {notJoined.length === 0 ? (
              <p className="mini-empty">모두 들어왔어요.</p>
            ) : (
              <ul className="audit-list">
                {notJoined.map((u) => (
                  <li key={u.studentNo}>
                    <span className="audit-action">{u.name}</span>
                    <span className="audit-detail">
                      {u.cohort} · {u.slc} · {CAMPUS_SHORT[u.campus] ?? u.campus}
                    </span>
                    <span className="audit-meta">…{u.studentNo.slice(-4)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <>
          <UserFilters facets={facets} current={sp} />

          <p className="atable-total" style={{ display: 'block', marginTop: 12 }}>
            {list.length}명
          </p>

          <div className="atable">
            <div className="atable-head utable-head">
              <span>이름</span>
              <span>소속</span>
              <span>커넥트</span>
              <span>최근 접속</span>
            </div>

            {list.length === 0 ? (
              <p className="mini-empty" style={{ padding: 20 }}>
                조건에 맞는 사람이 없어요.
              </p>
            ) : (
              list.map((u) => (
                <Link key={u.id} href={`/admin/members/${u.id}`} className="atable-row utable-row">
                  <div className="atable-main">
                    <span className="atable-name">
                      {u.name}
                      {u.role === 'admin' && <span className="utable-tag">운영</span>}
                    </span>
                    <span className="atable-sub">…{u.studentNo.slice(-4)}</span>
                  </div>

                  <span className="atable-sub">
                    {u.cohort} · {u.slc} · {CAMPUS_SHORT[u.campus] ?? u.campus}
                  </span>

                  <span className="utable-connects" data-none={u.connectCount === 0}>
                    {u.connectCount === 0 ? '미소속' : u.connectNames.join(', ')}
                  </span>

                  <span className="atable-sub">
                    {u.lastLoginAt
                      ? u.lastLoginAt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                      : '—'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}
