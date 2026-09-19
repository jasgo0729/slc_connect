'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { CERT_MESSAGES, submitCertification } from '@/lib/db/queries/certifications';
import { isCertType, type CertType } from '@/lib/connects/certification';
import { todayKST } from '@/lib/connects/deadline';
import { deleteObject } from '@/lib/storage/s3';

export interface CertifyState {
  error?: string;
}

/**
 * G-04 인증 제출.
 *
 * 사진은 이미 S3에 올라가 있고 키만 넘어온다. 저장에 실패하면
 * 그 사진들은 주인 없이 남으므로 지운다.
 */
export async function submitCertifyAction(
  connectId: string,
  form: {
    type: string;
    photoKeys: string[];
    activityDate: string;
    onlinePlatform: string;
    content: string;
    outputLink: string;
    participantIds: string[];
    crossConnectId: string | null;
    crossParticipantIds: string[];
  },
): Promise<CertifyState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${connectId}/certify`)}`);

  const cleanup = async () => {
    for (const k of form.photoKeys) await deleteObject(k);
  };

  if (!isCertType(form.type)) {
    await cleanup();
    return { error: '알 수 없는 인증 방식이에요.' };
  }

  const content = form.content.trim();
  if (!content) {
    await cleanup();
    return { error: '활동 소개를 적어주세요.' };
  }
  if (!form.activityDate) {
    await cleanup();
    return { error: '활동한 날짜를 골라주세요.' };
  }

  // 열린 리다이렉트를 만들 수는 없지만, 형식이 아니면 받지 않는다.
  const link = form.outputLink.trim();
  if (link && !/^https?:\/\//.test(link)) {
    await cleanup();
    return { error: '링크는 http:// 또는 https:// 로 시작해야 해요.' };
  }

  const r = await submitCertification(
    user.id,
    {
      connectId,
      activityDate: form.activityDate,
      activityType: form.type as CertType,
      onlinePlatform: form.onlinePlatform.trim() || null,
      content: content.slice(0, 500),
      photoKeys: form.photoKeys,
      outputLink: link || null,
      participantIds: form.participantIds,
      crossConnectId: form.crossConnectId,
      crossParticipantIds: form.crossParticipantIds,
    },
    todayKST(),
  );

  if (!r.ok) {
    await cleanup();
    return { error: CERT_MESSAGES[r.reason] };
  }

  revalidatePath(`/connects/${connectId}`);
  revalidatePath('/admin/certifications');
  redirect(`/connects/${connectId}?certified=1`);
}
