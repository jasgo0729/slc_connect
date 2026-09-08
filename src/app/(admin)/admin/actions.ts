'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import {
  confirmAllTeams,
  sendNotice,
  setCapacity,
  type NotifyAudience,
} from '@/lib/db/queries/admin-ops';
import { setSeasonValue } from '@/lib/db/queries/season';

/**
 * 운영 화면의 조작들.
 *
 * 화면에서 버튼을 감추더라도 여기서 권한을 다시 본다.
 * 서버 액션은 폼을 거치지 않고 직접 호출할 수 있다.
 */
async function admin() {
  try {
    return await requireAdmin();
  } catch {
    redirect('/connects');
  }
}

/** J-06 유연 증원. */
export async function setCapacityAction(
  connectId: string,
  capacity: number,
): Promise<{ error?: string }> {
  const a = await admin();
  const r = await setCapacity(a.id, connectId, capacity);
  if (!r.ok) return { error: r.reason };

  revalidatePath('/admin/connects/all');
  revalidatePath(`/connects/${connectId}`);
  revalidatePath('/connects');
  return {};
}

/** J-04 공지 발송. */
export async function sendNoticeAction(
  audience: NotifyAudience,
  title: string,
  body: string,
  link: string,
): Promise<{ error?: string; sent?: number }> {
  const a = await admin();

  const t = title.trim();
  const b = body.trim();
  if (!t) return { error: '제목을 입력해주세요.' };
  if (!b) return { error: '내용을 입력해주세요.' };

  // 열린 리다이렉트 방지 — 같은 사이트 경로만 허용한다.
  const safe = link.trim();
  const href = safe.startsWith('/') && !safe.startsWith('//') ? safe : null;

  const sent = await sendNotice(a.id, audience, t, b, href);
  revalidatePath('/admin/notify');
  return { sent };
}

/** J-07 랭킹 공개 모드 등 시즌 설정. */
export async function setSeasonAction(key: string, value: string): Promise<{ error?: string }> {
  const a = await admin();
  await setSeasonValue(a.id, key, value.trim());
  revalidatePath('/admin/season');
  revalidatePath('/ranking');
  return {};
}

/**
 * D-16 팀 확정 일괄 처리.
 *
 * 되돌릴 수 없다. 화면에서 미리보기를 보여주고 확인을 받은 뒤에만 부른다.
 */
export async function confirmAllAction(): Promise<{ error?: string; connects?: number; notified?: number }> {
  const a = await admin();
  const r = await confirmAllTeams(a.id);
  revalidatePath('/admin');
  revalidatePath('/admin/confirm');
  revalidatePath('/connects');
  return r;
}
