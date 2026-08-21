import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * 로그인 필수 영역.
 *
 * proxy.ts는 쿠키 존재 여부만 본다. 실제 검증은 여기서 한다.
 * Next.js 16은 proxy를 네트워크 수준 작업으로 제한하고 인증은
 * 이런 데이터 접근 지점에 두라고 권한다. proxy의 matcher를
 * 한 줄 잘못 고쳐도 이 레이아웃이 남아 있으면 뚫리지 않는다.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    const hdrs = await headers();
    // proxy가 심어 둔 현재 경로. 로그인 후 여기로 돌아온다.
    const path = hdrs.get('x-pathname') ?? '/connects';
    redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  }

  return <>{children}</>;
}
