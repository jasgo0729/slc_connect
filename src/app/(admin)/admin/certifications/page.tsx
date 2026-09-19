import { getParticipants, listPendingReview } from '@/lib/db/queries/certifications';
import { createViewUrl, storageEnabled } from '@/lib/storage/s3';
import { ReviewList } from './review-list';

export const dynamic = 'force-dynamic';

/**
 * G-05 인증 검수.
 *
 * 운영에서 가장 부하가 큰 화면이다. 주 60~90건이 여기를 지난다.
 * 한 건에 클릭 하나로 끝나야 하고, 사진과 참여자를 같은 화면에서
 * 봐야 한다 — 대조하려고 다른 곳을 다녀오면 시간이 배로 든다.
 *
 * 사진 주소는 서명해서 내보낸다. 버킷을 공개하지 않으므로
 * 이 주소로만 볼 수 있고, 10분 뒤 만료된다.
 */
export default async function CertReviewPage() {
  const pending = await listPendingReview(50);

  const items = await Promise.all(
    pending.map(async (c) => ({
      ...c,
      // 유형마다 장수가 다르다. 순서가 곧 사진의 의미라 그대로 낸다.
      photoUrls: storageEnabled()
        ? ((await Promise.all(c.photoKeys.map((k) => createViewUrl(k)))).filter(
            Boolean,
          ) as string[])
        : [],
      participants: await getParticipants(c.id),
    })),
  );

  return (
    <main className="shell admin-page">
      <h1 className="me-title">인증 검수</h1>
      <p className="create-lede">
        사진에 참여자가 보이는지, 활동 내용과 맞는지 확인해 주세요.
      </p>

      <ReviewList items={items} />
    </main>
  );
}
