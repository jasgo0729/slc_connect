import { redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { MyConnectCard } from '@/components/my-connect-card';
import { IconUser } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { countUnread } from '@/lib/db/queries/notifications';
import {
  getAppliedConnects,
  getApplicantsForLed,
  getLedConnects,
  getMyConnectMbti,
  getMyFavorites,
  getMyTags,
} from '@/lib/db/queries/me';
import type { MyConnect } from '@/lib/db/queries/me';
import { findConnectMbti } from '@/lib/connects/mbti';
import { DAYS } from '@/lib/connects/options';
import { ProfileEditor } from './profile-editor';
import { LedConnects } from './led-connects';

export const dynamic = 'force-dynamic';

/**
 * 1-4 마이페이지.
 *
 * 찜한 것 · 신청한 것 · 개설한 것 세 갈래로 나눈다.
 * 기획안은 D-11 신청 현황을 따로 잡았지만 여기 합쳤다 —
 * 하단 탭바에 '마이'가 하나뿐이라 나눠 두면 갈 길이 없어진다.
 *
 * 비밀번호 수정 항목은 없다. 비밀번호가 존재하지 않는다.
 */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="kv-key">{label}</span>
      <span className="kv-val">{value}</span>
    </div>
  );
}

const EMPTY = <span className="kv-empty">미입력</span>;

/**
 * 트랙별로 묶어 보여준다.
 *
 * 취미와 도전은 참여 방식이 아예 다르다. 섞어 두면 "승인 대기중"이
 * 왜 어떤 것에만 붙는지 알 수 없다.
 */
function TrackGroups({
  items,
  variant,
  empty,
}: {
  items: MyConnect[];
  variant: 'favorite' | 'applied';
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <section className="card-block">
        <p className="mini-empty">{empty}</p>
      </section>
    );
  }

  const groups: [string, string][] = [
    ['quantitative', '취미'],
    ['qualitative', '도전'],
  ];

  return (
    <>
      {groups.map(([track, label]) => {
        const rows = items.filter((c) => c.track === track);
        if (rows.length === 0) return null;
        return (
          <div key={track} className="track-group">
            <p className="track-group-title">{label}</p>
            <div className="cards">
              {rows.map((c) => (
                <MyConnectCard key={c.id} c={c} variant={variant} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=%2Fme');

  const [favorites, applied, led, mbtiCode, myTags] = await Promise.all([
    getMyFavorites(user.id),
    getAppliedConnects(user.id),
    getLedConnects(user.id),
    getMyConnectMbti(user.id),
    getMyTags(user.id),
  ]);

  const applicants = await getApplicantsForLed(led.map((c) => c.id));
  const unread = await countUnread(user.id);
  const connectMbti = findConnectMbti(mbtiCode);

  return (
    <>
      <AppBar current="/me" user={{ id: user.id, name: user.name }} />

      <main className="page shell me">
        <h1 className="me-title">마이페이지</h1>

        <section className="card-block me-head">
          <div className="me-avatar">
            <IconUser size={26} />
          </div>
          <div>
            <p className="me-name">{user.name}</p>
            <p className="me-bio">{user.bio ?? '한 줄 소개를 적어보세요'}</p>
          </div>
        </section>

        {/* 명단에서 온 값. 사용자가 고칠 수 없다. */}
        <section className="card-block">
          <Row label="이름" value={user.name} />
          <Row label="기수" value={user.cohort} />
          <Row label="소속 SLC" value={user.slc} />
          <Row label="캠퍼스" value={user.campus} />
        </section>

        <div className="me-sechead">
          <h2 className="me-sectitle">내 프로필</h2>
          <ProfileEditor
            initial={{
              bio: user.bio,
              residence: user.residence,
              mbtiType: user.mbtiType,
              tags: myTags,
              days: (user.preferredDays ?? []).map((d) => DAYS[d]).filter(Boolean) as string[],
            }}
          />
        </div>

        <section className="card-block">
          <Row label="한 줄 소개" value={user.bio ?? EMPTY} />
          <Row label="방학 중 거주지" value={user.residence ?? EMPTY} />
          <Row label="MBTI" value={user.mbtiType ?? EMPTY} />

          <div className="kv kv--stack">
            <span className="kv-key">Connect-MBTI</span>
            {connectMbti ? (
              <>
                <div className="cmbti">
                  <span className="cmbti-emoji" aria-hidden="true">
                    {connectMbti.emoji}
                  </span>
                  <p className="cmbti-title">
                    {connectMbti.code} · {connectMbti.animal}
                    <span>{connectMbti.title}</span>
                  </p>
                </div>
                <p className="cmbti-desc cmbti-desc--full">{connectMbti.description}</p>
              </>
            ) : (
              <a href="/mbti" className="cmbti cmbti--empty">
                <span className="cmbti-emoji" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <p className="cmbti-title">아직 검사 전이에요</p>
                  <p className="cmbti-desc">12문항이면 끝나요. 결과에 맞는 커넥트를 골라 드려요.</p>
                </div>
              </a>
            )}
          </div>
        </section>

        <h2 className="me-sectitle me-sectitle--gap">내가 찜한 Connect</h2>
        <TrackGroups
          items={favorites}
          variant="favorite"
          empty="마음에 드는 커넥트를 찜해두면 여기 모여요."
        />

        <h2 className="me-sectitle me-sectitle--gap">내가 신청한 Connect</h2>
        <TrackGroups
          items={applied}
          variant="applied"
          empty="아직 신청한 커넥트가 없어요."
        />

        <h2 className="me-sectitle me-sectitle--gap">내가 개설한 Connect</h2>
        <LedConnects connects={led} applicants={applicants} />
      </main>

      <TabBar current="/me" unread={unread} />
    </>
  );
}
