'use server';

import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { tags, userTags, users } from '@/lib/db/schema';
import { DAYS } from '@/lib/connects/options';

/**
 * A-05·A-06 프로필 저장.
 *
 * 모든 항목이 선택이라 빈 값도 정상이다. 빈 문자열은 NULL로 저장해
 * "입력하지 않음"과 "빈칸을 넣음"을 같게 만든다 — 그래야 조회하는
 * 쪽에서 한 가지 경우만 다루면 된다.
 *
 * 관심 태그와 선호 요일까지 저장한다. 폼에서 받아 놓고 버리면
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

  const tagNames = [...new Set(fd.getAll('tags').map(String).filter(Boolean))].slice(0, 20);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        bio: s('bio'),
        residence: s('residence'),
        mbtiType: s('mbtiType'),
        preferredDays,
      })
      .where(eq(users.id, user.id));

    // 태그는 목록 전체를 갈아 끼운다. 무엇이 빠졌는지 계산할 필요가 없다.
    await tx.delete(userTags).where(eq(userTags.userId, user.id));
    if (tagNames.length === 0) return;

    // 없는 태그는 만들어 둔다. 관리자가 미리 등록해 두지 않아도
    // 사용자가 고른 값이 사라지지 않는다.
    await tx
      .insert(tags)
      .values(tagNames.map((name) => ({ name })))
      .onConflictDoNothing();

    const rows = await tx.select({ id: tags.id }).from(tags).where(inArray(tags.name, tagNames));
    await tx
      .insert(userTags)
      .values(rows.map((r) => ({ userId: user.id, tagId: r.id })))
      .onConflictDoNothing();
  });

  revalidatePath('/me');
}
