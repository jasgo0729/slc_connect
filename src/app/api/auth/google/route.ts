import { generateCodeVerifier, generateState } from 'arctic';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import {
  NEXT_COOKIE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  google,
  safeNext,
} from '@/lib/auth/google';

export async function GET(req: NextRequest) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // 로그인 후 돌아갈 곳. C-13 초대 링크와 F-06 MBTI 결과가 같이 쓴다.
  const next = safeNext(req.nextUrl.searchParams.get('callbackUrl'));

  const url = google.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'profile',
    'email',
  ]);

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };

  jar.set(STATE_COOKIE, state, opts);
  jar.set(VERIFIER_COOKIE, codeVerifier, opts);
  jar.set(NEXT_COOKIE, next, opts);

  return Response.redirect(url.toString());
}
