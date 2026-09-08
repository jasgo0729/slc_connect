import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { safeNext } from '@/lib/auth/google';
import { WelcomeFlow } from './flow';

export const dynamic = 'force-dynamic';

/**
 * 결속 직후 안내와 프로필 입력.
 *
 * 환영 → 프로필 입력 → 완료 세 단계가 한 화면 위에서 겹쳐 뜬다.
 * 화면을 옮기지 않는 이유는 스킵했을 때 곧바로 씨앗판으로 보내기 위해서다.
 */
interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function WelcomePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { callbackUrl } = await searchParams;
  return <WelcomeFlow next={safeNext(callbackUrl)} />;
}
