import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'connect_session';

/**
 * Proxy — Next.js 16에서 middleware.ts를 대체한다.
 *
 * 값싼 1차 관문일 뿐이다. 여기서 세션이 실제로 유효한지 확인하지 않는다.
 *
 * Node.js 런타임에서 돌긴 하지만, Next.js는 이 파일을 리다이렉트·리라이트·
 * 헤더 수정 같은 네트워크 수준 작업으로 제한할 것을 권한다. DB 조회나
 * 세션 검증 같은 무거운 로직은 레이아웃과 라우트 핸들러 쪽에 둔다.
 * 2025년 3월 미들웨어 기반 인가 검사를 헤더 하나로 우회하는 취약점이
 * 공개된 뒤로, 여기에 인증을 두지 않는 것이 권장 방식이 되었다.
 *
 * 진짜 검증은 (app)/layout.tsx 의 getCurrentUser() 와 requireAdmin() 이 한다.
 *
 * 겸사겸사 현재 경로를 헤더로 넘긴다. 서버 컴포넌트는 자기 URL을
 * 알 수 없어서, 로그인 후 복귀 주소를 만들려면 이게 필요하다.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const headers = new Headers(req.headers);
  headers.set('x-pathname', pathname + search);

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers } });
}

/**
 * 보호할 경로만 나열한다.
 *
 * 공개 영역(/, /login, /onboarding, /invite, /mbti)과
 * API·정적 파일은 여기 들어오지 않는다.
 */
export const config = {
  matcher: [
    '/connects/:path*',
    '/recommend/:path*',
    '/ranking/:path*',
    '/games/:path*',
    '/me/:path*',
    '/admin/:path*',
  ],
};
