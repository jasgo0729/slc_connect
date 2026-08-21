import { decodeIdToken } from 'arctic';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import {
  NEXT_COOKIE,
  PENDING_COOKIE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  google,
  safeNext,
} from '@/lib/auth/google';
import type { GoogleClaims } from '@/lib/auth/google';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { createSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const jar = await cookies();

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const storedState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  const next = safeNext(jar.get(NEXT_COOKIE)?.value);

  const clearTransient = () => {
    for (const k of [STATE_COOKIE, VERIFIER_COOKIE, NEXT_COOKIE]) jar.delete(k);
  };

  // state 불일치는 CSRF 신호다. 조용히 로그인 화면으로 되돌린다.
  if (!code || !state || !verifier || state !== storedState) {
    clearTransient();
    return Response.redirect(new URL('/login?error=invalid_request', req.url));
  }

  let claims: GoogleClaims;
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    claims = decodeIdToken(tokens.idToken()) as unknown as GoogleClaims;
  } catch {
    // 도메인 제한을 두지 않으므로 여기서 걸리는 것은 인증 실패뿐이다.
    clearTransient();
    return Response.redirect(new URL('/login?error=oauth', req.url));
  }

  clearTransient();

  const found = await db
    .select()
    .from(users)
    .where(eq(users.googleSub, claims.sub))
    .limit(1);
  const user = found[0];

  // 최초 로그인 — 학번 결속 화면으로.
  if (!user) {
    jar.set(
      PENDING_COOKIE,
      JSON.stringify({ sub: claims.sub, email: claims.email, hd: claims.hd ?? null }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 900,
      },
    );
    const url = new URL('/onboarding', req.url);
    url.searchParams.set('callbackUrl', next);
    return Response.redirect(url);
  }

  // 학교가 이메일 주소를 바꿨을 수 있다. sub은 그대로이므로 갱신만 한다.
  await db
    .update(users)
    .set({ googleEmail: claims.email, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  await createSession(user.id, req.headers.get('user-agent') ?? undefined);

  return Response.redirect(new URL(next, req.url));
}
