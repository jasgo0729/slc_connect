import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { Notice } from '@/components/ui/notice';
import { IconArrowLeft } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectDetail } from '@/lib/db/queries/connect-detail';
import { getCrossCandidates, getMemberNames } from '@/lib/db/queries/certifications';
import { CERT_SPECS, isCertType } from '@/lib/connects/certification';
import { storageEnabled } from '@/lib/storage/s3';
import { CertifyForm } from './certify-form';

export const dynamic = 'force-dynamic';

/**
 * G-04 활동 인증 제출.
 *
 * 팀원만 들어온다. 참여자 이름을 골라야 하므로 실명을 쓴다 —
 * 씨앗판이 이름을 가리는 것과 달리, 자기 팀 사람이라 가릴 이유가
 * 없고 가리면 누가 누군지 알 수 없다.
 */
interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function CertifyPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { type: raw } = await searchParams;
  const type = isCertType(raw ?? '') ? (raw as 'offline' | 'cross' | 'online') : 'offline';

  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${id}/certify`)}`);

  const c = await getConnectDetail(id, user.id);
  if (!c) notFound();
  if (!c.viewer.isMember) redirect(`/connects/${id}`);

  const [members, crossConnects] = await Promise.all([
    getMemberNames(id),
    type === 'cross' ? getCrossCandidates(id) : Promise.resolve([]),
  ]);

  return (
    <>
      <AppBar current="/connects" user={{ id: user.id, name: user.name }} />

      <main className="page shell create">
        <Link href={`/connects/${id}`} className="detail-meta" style={{ marginTop: 0 }}>
          <IconArrowLeft size={18} /> {CERT_SPECS[type].label}
        </Link>

        {!storageEnabled() ? (
          <div style={{ marginTop: 20 }}>
            <Notice>사진 저장소가 아직 설정되지 않았어요. 운영진에게 알려주세요.</Notice>
          </div>
        ) : (
          <CertifyForm
            connectId={id}
            type={type}
            members={members}
            me={user.id}
            crossConnects={crossConnects}
          />
        )}
      </main>
    </>
  );
}
