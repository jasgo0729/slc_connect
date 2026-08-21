import { redirect } from 'next/navigation';
import { destroySession } from '@/lib/auth/session';

/**
 * 로그아웃.
 *
 * POST만 받는다. GET 링크로 두면 브라우저나 확장 프로그램이
 * 미리 열어 보는 것만으로 세션이 끊길 수 있다.
 *
 * Response.redirect 대신 next/navigation의 redirect를 쓴다 —
 * 전자는 쿠키 삭제가 응답에 실리기 전에 리다이렉트를 만들어
 * 세션 쿠키가 남는 경우가 있다.
 */
export async function POST() {
  await destroySession();
  redirect('/connects');
}
