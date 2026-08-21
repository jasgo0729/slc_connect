import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { IconArrowLeft } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { CreateForm } from './create-form';

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

  return (
    <>
      <AppBar current="/connects" user={{ name: user.name }} />
      <main className="page shell create">
        <Link href="/connects" className="detail-meta" style={{ marginTop: 0 }}>
          <IconArrowLeft size={18} /> 커넥트 개설
        </Link>

        <h1 className="create-title">어떤 사람들과 만나고 싶나요</h1>
        <p className="create-lede">
          {user.name}님이 팀장이 됩니다. 개설하면 바로 한 자리가 채워지고, 나머지 자리를 기다리게
          돼요.
        </p>

        <CreateForm />
      </main>
      <TabBar current="/connects/new" />
    </>
  );
}
