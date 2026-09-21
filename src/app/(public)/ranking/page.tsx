import Link from 'next/link';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { IconArrowLeft } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';
import { getRankingMode } from '@/lib/db/queries/season';
import { getMyConfirmedConnectIds, listRanking } from '@/lib/db/queries/ranking';
import type { RankRow } from '@/lib/db/queries/ranking';
import { RANKING_PERIOD_LABEL } from '@/lib/connects/score-events';

export const dynamic = 'force-dynamic';

/**
 * G-13 커넥트 랭킹(시안 30).
 *
 * 공개 범위는 season_config.ranking_mode 가 정한다.
 *   full    전체 순위와 점수
 *   partial 상위 5팀 팀명만 (막판 비공개 구간)
 *   hidden  아무것도
 * 화면에서 감추는 것으로 끝내지 않고 쿼리에서 값을 비워 돌려준다
 * (listRanking). 화면만 가리면 응답에는 순위가 그대로 실려 간다.
 *
 * 스타일은 이 파일 안에 두지 않고 globals.css 로 옮겼다. 안내
 * 화면 하나였을 때와 달리 지금은 히어로 카드(board.tsx)와 순위
 * 표기를 나눠 쓰기 때문에, 한 파일에 가둬 두면 두 벌이 된다.
 */
const CAMPUS_LABEL: Record<string, string> = {
  인문사회: '인사캠',
  자연과학: '자과캠',
  공통: '공통',
};

export default async function RankingPage() {
  const user = await getCurrentUser();

  const mode = await getRankingMode();
  const [rows, unread, myIds] = await Promise.all([
    listRanking(mode),
    user ? countUnread(user.id) : Promise.resolve(0),
    user ? getMyConfirmedConnectIds(user.id) : Promise.resolve([]),
  ]);

  const mine = new Set(myIds);
  // 내 팀 카드는 위에 따로 띄운다. 30팀 목록에서 자기 팀을 눈으로
  // 찾게 하면, 정작 이 화면에 온 이유를 스크롤로 만든다.
  const myRows = rows.filter((r) => mine.has(r.connectId));

  return (
    <>
      <AppBar
        current="/ranking"
        user={user ? { id: user.id, name: user.name } : null}
        callbackUrl="/ranking"
      />

      <main className="page shell rank-page">
        <Link href="/connects" className="detail-meta" style={{ marginTop: 0 }}>
          <IconArrowLeft size={18} /> {RANKING_PERIOD_LABEL} 랭킹
        </Link>

        {mode === 'hidden' ? (
          <Closed
            title="순위를 잠시 가려 두었어요"
            body="막바지에는 순위를 공개하지 않아요. 활동 인증은 평소처럼 하시면 됩니다."
          />
        ) : rows.length === 0 ? (
          <Closed
            title="아직 순위를 매길 활동이 없어요"
            body="인증이 쌓이면 팀별 점수와 순위가 여기에 나타납니다."
          />
        ) : (
          <>
            {myRows.map((r) => (
              <MyCard key={r.connectId} row={r} />
            ))}

            <h2 className="rank-heading">
              {mode === 'partial' ? '상위 5팀' : '전체 순위'}
            </h2>

            {/* 씨앗판에서 본 팀이 여기 없으면 빠진 줄 안다. 한 줄로 알린다. */}
            <p className="field-hint" style={{ marginTop: -4, marginBottom: 12 }}>
              취미 커넥트끼리 겨뤄요. 도전 커넥트는 랭킹에 포함되지 않아요.
            </p>

            {mode === 'partial' && (
              <p className="field-hint" style={{ marginBottom: 12 }}>
                막바지라 순위와 점수는 가려 두었어요. 이름은 가나다순이에요.
              </p>
            )}

            <ul className="rank-list">
              {rows.map((r) => (
                <li key={r.connectId}>
                  <Link
                    href={`/connects/${r.connectId}`}
                    className="rank-row"
                    data-mine={mine.has(r.connectId)}
                  >
                    <span className="rank-num">{r.rank ?? '·'}</span>

                    <span className="rank-body">
                      <span className="rank-name">
                        {mine.has(r.connectId) && (
                          <span className="rank-star" aria-hidden="true">
                            ★
                          </span>
                        )}
                        {r.name}
                        {mine.has(r.connectId) && <span className="rank-tag">내 커넥트</span>}
                      </span>
                      <span className="rank-meta">
                        {CAMPUS_LABEL[r.campus] ?? r.campus} · {r.memberCount}/{r.capacity}명
                      </span>
                    </span>

                    {r.points !== null && <span className="rank-points">{r.points}점</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <TabBar current="/ranking" unread={unread} />
    </>
  );
}

/** 내 팀 요약 카드. 취미·도전 둘 다 속해 있으면 두 장이 된다. */
function MyCard({ row }: { row: RankRow }) {
  return (
    <Link href={`/connects/${row.connectId}`} className="rank-mine">
      <span className="rank-mine-left">
        <span className="rank-mine-eyebrow">내 커넥트</span>
        <span className="rank-mine-name">{row.name}</span>
      </span>
      {row.rank !== null && row.points !== null && (
        <span className="rank-mine-right">
          <span className="rank-mine-rank">{row.rank}위</span>
          <span className="rank-mine-points">{row.points}점</span>
        </span>
      )}
    </Link>
  );
}

/**
 * 순위를 보여주지 않는 경우.
 *
 * 막다른 길로 두지 않는다 — 지금 할 수 있는 것으로 보낸다.
 * 상단 바와 탭바가 이 주소를 가리키고 있어 비워 두면 404가 된다.
 */
function Closed({ title, body }: { title: string; body: string }) {
  return (
    <div className="rank-soon">
      <div className="rank-soon-inner">
        <span className="rank-soon-mark" aria-hidden="true">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 20h4V10H5zM10 20h4V4h-4zM15 20h4v-7h-4z" />
          </svg>
        </span>
        <h1 className="rank-soon-title">{title}</h1>
        <p className="rank-soon-body">{body}</p>
        <div className="rank-soon-cta">
          <Link href="/connects" className="btn">
            씨앗판 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
}
