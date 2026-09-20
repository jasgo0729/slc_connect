import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { IconArrowLeft } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { SEASON_KEYS, getSeasonConfig } from '@/lib/db/queries/season';
import { formatDeadline, isRecruitClosed } from '@/lib/connects/deadline';
import { CreateForm } from './create-form';
import { ClosedNotice } from './closed-notice';

export const dynamic = 'force-dynamic';

/**
 * C-01~C-10 커넥트 개설.
 *
 * 로그인이 필요하다. 목록(/connects)은 공개지만 개설은 아니므로
 * 여기서 검사한다 — proxy.ts의 matcher로는 목록과 하위 경로를
 * 경로 패턴으로 가르기 어렵다.
 */
export default async function NewConnectPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=%2Fconnects%2Fnew');

  /* 모집이 끝나면 개설을 받지 않는다. 마감 뒤에 만든 커넥트는
     신청을 받을 수 없어 빈 채로 남는다(new/actions.ts 와 같은 판정).

     탭바 가운데 '개설' 버튼을 감추는 대신 여기서 막는다. 진입점이
     탭바·씨앗판·주소로 여럿이라 한 곳씩 감추면 반드시 하나가 새고,
     감춘 버튼은 왜 사라졌는지도 알려주지 못한다. */
  const season = await getSeasonConfig();
  const deadline = season[SEASON_KEYS.recruitDeadline.key];

  if (isRecruitClosed(deadline)) {
    return (
      <>
        <AppBar current="/connects" user={{ id: user.id, name: user.name }} />
        <main className="page shell create">
          <Link href="/connects" className="detail-meta" style={{ marginTop: 0 }}>
            <IconArrowLeft size={18} /> 커넥트 개설
          </Link>
          <h1 className="create-title">모집이 끝났어요</h1>
          <p className="create-lede">
            {formatDeadline(deadline) ?? '마감일'}에 모집이 마감됐어요. 지금은 새 커넥트를 만들 수
            없어요.
          </p>
        </main>
        <ClosedNotice deadline={formatDeadline(deadline)} />
        <TabBar current="/connects/new" />
      </>
    );
  }

  return (
    <>
      <AppBar current="/connects" user={{ id: user.id, name: user.name }} />
      <main className="page shell create">
        <Link href="/connects" className="detail-meta" style={{ marginTop: 0 }}>
          <IconArrowLeft size={18} /> 커넥트 개설
        </Link>

        <h1 className="create-title">어떤 사람들과 만나고 싶나요</h1>
        <p className="create-lede">
          {user.name}님이 이 커넥트의 팀장이 돼요. 개설하면 바로 한 자리가 채워지고, 나머지 자리를
          기다리게 됩니다.
        </p>

        <CreateForm />
      </main>
      <TabBar current="/connects/new" />
    </>
  );
}
