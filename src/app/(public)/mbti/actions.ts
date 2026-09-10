'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { mbtiResults } from '@/lib/db/schema';
import { CONNECT_MBTI } from '@/lib/connects/mbti';

/**
 * F-03 결과 저장.
 *
 * 비로그인도 응시할 수 있다(홍보 목적). 그 경우 user_id가 NULL로
 * 남고, 나중에 로그인해서 다시 보면 그때 저장된다.
 *
 * 결과는 users가 아니라 mbti_results에 쌓는다. 개인 MBTI와 다른
 * 값이고, 다시 해볼 수 있어야 하며, 최신 것을 쓰면 되기 때문이다.
 */
export async function saveMbtiResult(
  code: string,
  scores: Record<string, number>,
): Promise<void> {
  // 화면을 거치지 않고 임의 코드가 들어올 수 있다.
  if (!CONNECT_MBTI[code]) return;

  const user = await getCurrentUser();
  if (!user) return;

  await db.insert(mbtiResults).values({
    userId: user.id,
    typeCode: code,
    axisScores: scores,
  });

  revalidatePath('/me');
}
