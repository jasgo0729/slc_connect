import { Google } from 'arctic';

export const PENDING_COOKIE = 'g_pending';
export const STATE_COOKIE = 'g_state';
export const VERIFIER_COOKIE = 'g_verifier';
export const NEXT_COOKIE = 'g_next';

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  `${process.env.APP_URL}/api/auth/google/callback`,
);

/** 구글이 돌려주는 ID 토큰에서 우리가 쓰는 값들. */
export interface GoogleClaims {
  sub: string; // 불변 식별자. 이메일이 아니라 이걸 기준으로 잡는다.
  email: string;
  hd?: string; // 워크스페이스 도메인. 개인 계정에는 없다. 기록용으로만 남긴다.
  name?: string;
}

/**
 * 도메인 제한은 두지 않는다.
 *
 * 어떤 구글 계정으로도 들어올 수 있으므로, 본인 확인은 전적으로
 * 명단(roster)의 이름+학번 대조 하나에 걸린다. 그래서 두 가지가
 * 중요해진다.
 *
 *   1. 결속 시도 제한 — 구글 계정은 새로 만들면 그만이므로
 *      IP 기준을 함께 건다(lib/db/binding.ts).
 *   2. "이미 등록된 학번" 안내 — 학번을 먼저 등록당한 사람이
 *      상황을 알아채는 유일한 경로다.
 *
 * hd 클레임은 검사하지 않되 users.google_hd 에 저장은 한다.
 * 분쟁이 생겼을 때 학교 계정으로 들어온 사람인지 구분할 근거가 된다.
 */

/**
 * 열린 리다이렉트 방지.
 *
 * callbackUrl은 사용자가 준 값이므로 그대로 믿으면
 * 외부 사이트로 튕겨 보낼 수 있다. 같은 사이트의 경로만 허용한다.
 */
export function safeNext(raw: string | null | undefined, fallback = '/connects'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}
