import Link from 'next/link';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';

export const dynamic = 'force-dynamic';

/**
 * G-13 커넥트 랭킹 — 아직 열리지 않은 화면.
 *
 * 상단 바와 하단 탭바가 이미 이 주소를 가리키고 있어 비워 두면
 * 404가 뜬다. 없는 기능을 있는 척하지 않되, 언제 열리는지와 지금
 * 할 수 있는 것을 알려 준다 — 막다른 길로 두지 않는 것이 핵심이다.
 *
 * 스타일을 이 파일 안에 둔 이유: globals.css 에 클래스를 새로
 * 추가하면 그 파일을 함께 갱신해야 한다. 화면 하나뿐이라
 * 여기서 닫아 두는 편이 적용할 때 어긋날 여지가 없다.
 */
const STYLE = `
.rank-soon {
  min-height: 62vh;
  display: grid;
  place-items: center;
  padding: 40px 20px calc(60px + env(safe-area-inset-bottom) + 40px);
  text-align: center;
}
.rank-soon-inner { max-width: 26rem; }
.rank-soon-mark {
  width: 76px; height: 76px; margin: 0 auto 22px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: #eef2fe; color: #3152ea;
}
.rank-soon-when {
  font-size: 11px; font-weight: 700; letter-spacing: .1em;
  color: #3152ea; text-transform: uppercase;
}
.rank-soon-title {
  margin-top: 10px; font-size: 22px; font-weight: 800;
  letter-spacing: -.02em; color: #0f172b;
}
.rank-soon-body {
  margin: 10px 0 0; font-size: 14px; line-height: 1.7; color: #62748e;
}
.rank-soon-list {
  list-style: none; margin: 22px 0 0; padding: 0;
  display: grid; gap: 8px; text-align: left;
}
.rank-soon-list li {
  position: relative; padding-left: 16px;
  font-size: 12.5px; line-height: 1.65; color: #62748e;
}
.rank-soon-list li::before {
  content: '·'; position: absolute; left: 4px; color: #90a1b9;
}
.rank-soon-cta { margin-top: 26px; }
@media (min-width: 900px) {
  .rank-soon { padding-bottom: 64px; }
}
`;

const NOTES = [
  '활동을 인증하면 팀별로 점수가 쌓여요.',
  '취미는 만난 횟수, 도전은 1월에 낸 결과물로 계산돼요.',
  '막판에는 순위를 잠시 가려 둘 수 있어요.',
];

export default async function RankingPage() {
  const user = await getCurrentUser();
  const unread = user ? await countUnread(user.id) : 0;

  return (
    <>
      <style>{STYLE}</style>

      <AppBar
        current="/ranking"
        user={user ? { id: user.id, name: user.name } : null}
        callbackUrl="/ranking"
      />

      <main className="page shell rank-soon">
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

          <p className="rank-soon-when">활동이 시작되면 열려요</p>
          <h1 className="rank-soon-title">커넥트 랭킹</h1>
          <p className="rank-soon-body">
            아직 순위를 매길 활동이 없어요.
            <br />
            인증이 쌓이면 팀별 점수와 순위가 여기에 나타납니다.
          </p>

          <ul className="rank-soon-list">
            {NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>

          {/* 막다른 길로 두지 않는다. 지금 할 수 있는 것으로 보낸다. */}
          <div className="rank-soon-cta">
            <Link href="/connects" className="btn">
              씨앗판 둘러보기
            </Link>
          </div>
        </div>
      </main>

      <TabBar current="/ranking" unread={unread} />
    </>
  );
}
