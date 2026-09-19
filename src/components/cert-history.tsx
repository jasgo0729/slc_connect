import { IconSpark } from './ui/icon';
import { CertifyEntry } from './certify-entry';
import type { CertRow } from '@/lib/db/queries/certifications';

/**
 * G-04 활동 인증 이력.
 *
 * 팀원에게만 보인다. 남의 팀 활동 사진을 아무나 볼 이유가 없다.
 *
 * 사진은 여기서 띄우지 않는다. 목록마다 서명된 주소를 발급하면
 * 상세 화면을 열 때마다 인증 수만큼 S3 호출이 나간다.
 * 사진이 필요한 곳은 검수 화면이다.
 */
const STATUS: Record<string, { text: string; tone: string }> = {
  pending: { text: '확인 중', tone: 'review' },
  approved: { text: '확인됨', tone: 'open' },
  rejected: { text: '다시 올려주세요', tone: 'danger' },
};

export function CertHistory({
  connectId,
  items,
  showOnline,
}: {
  connectId: string;
  items: CertRow[];
  /** 온라인 인증은 방학 기간에만 연다(G-09). */
  showOnline: boolean;
}) {
  const approved = items.filter((i) => i.reviewStatus === 'approved').length;

  return (
    <section className="section">
      <div className="me-sechead">
        <h2 className="section-title">
          활동 인증 <span className="me-sectitle-sub">확인된 {approved}회</span>
        </h2>
        <CertifyEntry connectId={connectId} showOnline={showOnline} />
      </div>

      {items.length === 0 ? (
        <p className="field-hint" style={{ marginTop: 12 }}>
          모인 날마다 사진을 올려주세요. 확인되면 활동 기록에 쌓여요.
        </p>
      ) : (
        <ul className="cert-log">
          {items.map((c) => {
            const s = STATUS[c.reviewStatus] ?? STATUS.pending!;
            return (
              <li key={c.id}>
                <span className="cert-log-date">{c.activityDate}</span>
                <span className="cert-log-body">
                  {c.crossConnectName && (
                    <em className="cert-log-cross">{c.crossConnectName}와 함께</em>
                  )}
                  {c.content.length > 40 ? `${c.content.slice(0, 40)}…` : c.content}
                  {c.reviewStatus === 'rejected' && c.rejectReason && (
                    <em className="cert-log-reason">{c.rejectReason}</em>
                  )}
                </span>
                <span className={`badge badge--${s.tone}`}>{s.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="cert-note">
        <IconSpark size={12} />
        참여한 사람만 골라주세요. 개인 활동 기록에 그대로 남아요.
      </p>
    </section>
  );
}
