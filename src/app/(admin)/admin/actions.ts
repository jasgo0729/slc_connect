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
import { notifyCapacityChanged, notifyShortWarning } from '@/lib/notify/send';
import { getConnectBrief } from '@/lib/db/queries/applications';
import { getShortConnects } from '@/lib/db/queries/admin-ops';

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
  /** 화면이 알고 있는 이전 값. 알림 문구에 쓴다. */
  from?: number,
): Promise<{ error?: string }> {
  const a = await admin();
  const r = await setCapacity(a.id, connectId, capacity);
  if (!r.ok) return { error: r.reason };

  // 정원이 바뀌면 찜해 둔 사람의 판단이 달라진다.
  if (typeof from === 'number' && from !== capacity) {
    const brief = await getConnectBrief(connectId);
    if (brief) await notifyCapacityChanged(connectId, brief.name, from, capacity);
  }

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

/**
 * D-10 인원 미달 경고 일괄 발송.
 *
 * 마감 며칠 전에 한 번 누르는 버튼이다. 크론을 두지 않기로 했으므로
 * 사람이 시점을 정한다 — 자동 발송이 조용히 실패하면 팀장들은
 * 경고를 못 받은 채 마감을 맞는다.
 *
 * 커넥트마다 인원이 달라 문구가 개인화된다. 공지 발송(J-04)으로는
 * 이걸 할 수 없어 따로 둔다.
 */
export async function sendShortWarningsAction(): Promise<{ sent?: number; error?: string }> {
  await admin();

  const short = await getShortConnects();
  let sent = 0;
  for (const c of short) {
    if (await notifyShortWarning(c.id, c.name, c.memberCount)) sent += 1;
  }

  revalidatePath('/admin');
  revalidatePath('/admin/members');
  return { sent };
}
