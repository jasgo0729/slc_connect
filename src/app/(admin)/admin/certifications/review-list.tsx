'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Notice } from '@/components/ui/notice';
import { Sheet } from '@/components/ui/sheet';
import { REJECT_REASONS, reviewCertAction } from './actions';

/**
 * 검수 목록.
 *
 * 승인은 한 번의 클릭으로 끝난다. 확인을 받지 않는 이유는,
 * 60~90건마다 확인 창이 뜨면 아무도 읽지 않고 누르게 되기
 * 때문이다. 반려만 사유를 묻는다.
 *
 * 처리한 건은 목록에서 바로 감춘다. 서버 응답을 기다렸다가
 * 사라지면 같은 건을 두 번 누르게 된다.
 */
interface Item {
  id: string;
  connectId: string;
  connectName: string;
  activityDate: string;
  activityType: string;
  onlinePlatform: string | null;
  content: string;
  participantCount: number;
  crossConnectName: string | null;
  outputLink: string | null;
  participants: string[];
  submittedByName: string;
  photoUrls: string[];
  createdAt: Date;
}

const TYPE_LABEL: Record<string, string> = {
  offline: '커넥트',
  cross: 'CCC',
  online: '온라인',
};

/** 사진 순서가 곧 의미다. 검수자가 무엇을 보는지 알아야 한다. */
const PHOTO_LABELS: Record<string, string[]> = {
  offline: ['활동 사진', '시간 입증'],
  cross: ['활동 사진', '시간 입증', '씨앗판 프로필'],
  online: ['캡쳐 1', '캡쳐 2'],
};

export function ReviewList({ items }: { items: Item[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Item | null>(null);
  const [, start] = useTransition();

  const shown = items.filter((i) => !hidden.includes(i.id));

  const run = (id: string, approve: boolean, reason?: string) =>
    start(async () => {
      setError(null);
      setBusy(id);
      // 먼저 감춘다. 서버를 기다리면 같은 건을 두 번 누르게 된다.
      setHidden((v) => [...v, id]);

      const r = await reviewCertAction(id, approve, reason);
      setBusy(null);
      if (r.error) {
        setError(r.error);
        setHidden((v) => v.filter((x) => x !== id));
      }
    });

  if (shown.length === 0) {
    return (
      <section className="card-block" style={{ marginTop: 16 }}>
        <p className="mini-empty">검수를 기다리는 인증이 없어요.</p>
      </section>
    );
  }

  return (
    <>
      {error && <Notice>{error}</Notice>}
      <p className="field-hint" style={{ marginTop: 12 }}>
        {shown.length}건 대기 중
      </p>

      <div className="cert-list">
        {shown.map((c) => (
          <article key={c.id} className="cert-card">
            <div className="cert-head">
              <span className="cert-date">{c.activityDate}</span>
              <span className="badge badge--neutral">
                {TYPE_LABEL[c.activityType] ?? c.activityType}
                {c.activityType === 'online' && c.onlinePlatform ? ` · ${c.onlinePlatform}` : ''}
              </span>
              {c.crossConnectName && (
                <span className="badge badge--track">{c.crossConnectName}와 함께</span>
              )}
              <Link href={`/admin/connects/${c.connectId}`} className="cert-meta">
                {c.connectName}
              </Link>
            </div>

            <p className="cert-meta" style={{ marginTop: 6 }}>
              {c.submittedByName}님이 올림 · 참여 {c.participantCount}명
            </p>

            {/* 참여자 이름을 사진 위에 둔다. 대조하려면 함께 보여야 한다. */}
            <p className="cert-participants">{c.participants.join(', ')}</p>

            {c.photoUrls.length > 0 ? (
              <div className="cert-photos">
                {c.photoUrls.map((url, i) => (
                  <figure key={url}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={PHOTO_LABELS[c.activityType]?.[i] ?? '활동 사진'} loading="lazy" />
                    <figcaption>{PHOTO_LABELS[c.activityType]?.[i] ?? `사진 ${i + 1}`}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="field-hint" style={{ marginTop: 12 }}>
                사진을 불러오지 못했어요.
              </p>
            )}

            <p className="cert-body">{c.content}</p>

            {c.outputLink && (
              <a
                href={c.outputLink}
                target="_blank"
                rel="noreferrer noopener"
                className="cert-link"
              >
                산출물 보기 →
              </a>
            )}

            <div className="cert-actions">
              <button
                type="button"
                className="btn btn--danger btn--sm"
                disabled={busy === c.id}
                onClick={() => setRejecting(c)}
              >
                반려
              </button>
              <button
                type="button"
                className="btn btn--sm"
                disabled={busy === c.id}
                onClick={() => run(c.id, true)}
              >
                승인
              </button>
            </div>
          </article>
        ))}
      </div>

      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} labelledBy="cert-rj">
        <h2 className="sheet-title" id="cert-rj">
          어떤 점이 문제인가요?
        </h2>
        <p className="sheet-sub" style={{ textAlign: 'center', marginBottom: 16 }}>
          고른 사유가 올린 사람에게 그대로 전달돼요.
        </p>
        {REJECT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            className="opt"
            onClick={() => {
              const t = rejecting!;
              setRejecting(null);
              run(t.id, false, r);
            }}
          >
            {r}
          </button>
        ))}
      </Sheet>
    </>
  );
}
