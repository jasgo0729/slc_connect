import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthShell, AuthLogo } from '@/components/auth-shell';
import { PENDING_COOKIE, safeNext } from '@/lib/auth/google';
import { BindForm } from './bind-form';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function OnboardingPage({ searchParams }: Props) {
  const jar = await cookies();
  const pending = jar.get(PENDING_COOKIE)?.value;

  // 구글 로그인을 거치지 않고 직접 들어온 경우.
  if (!pending) redirect('/login');

  let email = '';
  try {
    email = (JSON.parse(pending) as { email?: string }).email ?? '';
  } catch {
    redirect('/login');
  }

  const { callbackUrl } = await searchParams;

  return (
    <AuthShell>
      <AuthLogo />
      <p className="auth-lede">
        SLC 소속 확인을 위해
        <br />
        이름과 학번을 입력해주세요.
      </p>
      <p className="auth-tagline" style={{ marginTop: 10 }}>
        {email}
      </p>
      <BindForm callbackUrl={safeNext(callbackUrl)} />
    </AuthShell>
  );
}
