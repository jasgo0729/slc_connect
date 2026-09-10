'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { DAYS } from '@/lib/connects/options';
import { isRegion } from '@/lib/connects/regions';

/**
 * A-05·A-06 프로필 저장.
 *
 * 모든 항목이 선택이라 빈 값도 정상이다. 빈 문자열은 NULL로 저장해
 * "입력하지 않음"과 "빈칸을 넣음"을 같게 만든다 — 그래야 조회하는
 * 쪽에서 한 가지 경우만 다루면 된다.
 *
 * 관심사와 선호 요일까지 저장한다. 폼에서 받아 놓고 버리면
 * 사용자는 저장했다고 믿는데 다음에 열면 비어 있다.
 */
export async function updateProfile(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const s = (k: string) => {
    const v = String(fd.get(k) ?? '').trim();
    return v === '' ? null : v;
  };

  // 요일은 이름이 아니라 번호로 저장한다. 표기가 바뀌어도 값이 남는다.
  const preferredDays = fd
    .getAll('days')
    .map((d) => DAYS.indexOf(String(d) as (typeof DAYS)[number]))
    .filter((i) => i >= 0)
    .sort();

  await db
    .update(users)
    .set({
      bio: s('bio'),
      // 목록에 없는 값이 들어오면 저장하지 않는다. 거주지 분포가
      // 시·도 단위로 묶이는 전제라 임의 문자열이 섞이면 어긋난다.
      residence: isRegion(String(fd.get('residence') ?? '')) ? s('residence') : null,
      mbtiType: s('mbtiType'),
      interests: s('interests'),
      preferredDays,
    })
    .where(eq(users.id, user.id));

  revalidatePath('/me');
}
