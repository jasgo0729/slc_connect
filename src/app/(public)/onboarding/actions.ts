'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PENDING_COOKIE, safeNext } from '@/lib/auth/google';
import {
  BIND_MESSAGES,
  BindingError,
  bindStudentNumber,
} from '@/lib/db/binding';
import { createSession } from '@/lib/auth/session';

export interface BindFormState {
  error?: string;
}

/**
 * 학번 결속 → 세션 발급 → 원래 가려던 곳으로.
 *
 * 성공 시 redirect()가 예외를 던져 함수가 끝나므로 반환값이 없다.
 * redirect()는 try 블록 밖에서 불러야 한다 — 안에서 부르면
 * catch가 그 예외를 삼킨다.
 */
export async function submitBinding(
  _prev: BindFormState,
  formData: FormData,
): Promise<BindFormState> {
  const jar = await cookies();
  const pending = jar.get(PENDING_COOKIE)?.value;

  // 쿠키가 없으면 결속 화면에 직접 들어온 것이다. 로그인부터.
  if (!pending) {
    redirect('/login?error=expired');
  }

  let sub: string;
  let email: string;
  let hd: string | null = null;
  try {
    const parsed = JSON.parse(pending) as { sub?: unknown; email?: unknown; hd?: unknown };
    if (typeof parsed.sub !== 'string' || typeof parsed.email !== 'string') {
      throw new Error('malformed');
    }
    sub = parsed.sub;
    email = parsed.email;
    hd = typeof parsed.hd === 'string' ? parsed.hd : null;
  } catch {
    redirect('/login?error=expired');
  }

  const studentNo = String(formData.get('studentNo') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const next = safeNext(String(formData.get('callbackUrl') ?? ''));

  if (!name) {
    return { error: '이름을 입력해 주세요.' };
  }
  if (!/^\d{6,12}$/.test(studentNo)) {
    return { error: '학번은 숫자로만 입력해 주세요.' };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? undefined;

  let userId: string;
  try {
    const user = await bindStudentNumber({
      googleSub: sub,
      googleEmail: email,
      googleHd: hd,
      studentNo,
      name,
      ip,
    });
    userId = user.id;
  } catch (err) {
    if (err instanceof BindingError) {
      return { error: BIND_MESSAGES[err.code] };
    }
    console.error('binding failed', err);
    return { error: '처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.' };
  }

  await createSession(userId, hdrs.get('user-agent') ?? undefined);
  jar.delete(PENDING_COOKIE);

  redirect(next);
}
