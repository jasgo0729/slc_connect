import { generateState, generateCodeVerifier } from 'arctic';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { google, ALLOWED_DOMAIN } from '@/lib/auth/google';
 
export async function GET(req: NextRequest) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
 
  // 로그인 후 돌아갈 곳. C-13 초대 링크와 F-06 MBTI 결과가 같이 쓴다.
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/connects';
 
  const url = google.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'profile',
    'email',
  ]);
 
  // hd 힌트. 강제력은 없고 계정 선택 화면을 좁혀 줄 뿐이므로
  // 서버 검증(assertStudentAccount)을 생략하면 안 된다.
  url.searchParams.set('hd', ALLOWED_DOMAIN);
 
  const jar = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure, path: '/', maxAge: 600, sameSite: 'lax' as const };
 
  jar.set('g_state', state, opts);
  jar.set('g_verifier', codeVerifier, opts);
  jar.set('g_next', callbackUrl, opts);
 
  return Response.redirect(url.toString());
}