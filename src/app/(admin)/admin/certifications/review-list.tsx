'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Notice } from '@/components/ui/notice';
import { Sheet } from '@/components/ui/sheet';
import { DELIVERABLE_GRADES, minParticipants } from '@/lib/scoring/rules';
import { CERT_REJECT_REASONS } from '@/lib/connects/cert-reject-reasons';
import { reviewCertAction } from './actions';

/**
 * 검수 목록.
 *
 * 승인은 한 번의 클릭으로 끝난다. 확인을 받지 않는 이유는,
 * 60~90건마다 확인 창이 뜨면 아무도 읽지 않고 누르게 되기
 * 때문이다. 반려만 사유를 묻는다.
 *
 * 규칙서 §6 의 점수가 붙으면서 검수에서 정할 것이 둘 늘었지만,
 * 둘 다 해당하는 건에서만 묻는다.
 *   · 산출물 등급(§6.6) — 산출물 링크가 있는 건만. 승인 직전에 묻는다.
 *   · 친목 활동 표시(§6.4) — 카드의 체크박스. 기본값은 꺼짐이다.
 * 나머지 건은 예전과 똑같이 승인 한 번으로 끝난다.
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
  capacity: number;
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
  const [grading, setGrading] = useState<Item | null>(null);
  const [social, setSocial] = useState<string[]>([]);
  /** 방금 무엇이 붙었는지. 규칙이 복잡해 결과를 바로 못 본다. */
  const [done, setDone] = useState<{ name: string; awarded: number; total: number } | null>(null);
  const [, start] = useTransition();

  const shown = items.filter((i) => !hidden.includes(i.id));

  const run = (item: Item, approve: boolean, reason?: string, deliverableScore?: number) =>
    start(async () => {
      setError(null);
      setBusy(item.id);
      // 먼저 감춘다. 서버를 기다리면 같은 건을 두 번 누르게 된다.
      setHidden((v) => [...v, item.id]);

      const r = await reviewCertAction(item.id, approve, reason, {
        isSocial: social.includes(item.id),
        deliverableScore,
      });
      setBusy(null);

      if (r.error) {
        setError(r.error);
        setHidden((v) => v.filter((x) => x !== item.id));
        return;
      }
      if (approve) {
        setDone({ name: item.connectName, awarded: r.awarded ?? 0, total: r.total ?? 0 });
      }
    });

  /** 산출물이 있으면 등급부터 묻고, 없으면 바로 승인한다. */
  const approve = (item: Item) => {
    if (item.outputLink) setGrading(item);
    else run(item, true);
  };

  const toggleSocial = (id: string) =>
    setSocial((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

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

      {done && (
        <Notice>
          {done.name} · 이 인증으로 {done.awarded}점 · 팀 누적 {done.total}점
        </Notice>
      )}

      <p className="field-hint" style={{ marginTop: 12 }}>
        {shown.length}건 대기 중
      </p>

      <div className="cert-list">
        {shown.map((c) => {
          // §6.3 기준 인원. 미달이면 승인해도 기본·초과 점수가 붙지
          // 않으므로 누르기 전에 알려준다.
          const min = minParticipants(c.capacity);
          const short = c.participantCount < min;

          return (
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
                {short && (
                  <span className="badge badge--danger" style={{ marginLeft: 8 }}>
                    기준 {min}명 미달 · 점수 없음
                  </span>
                )}
              </p>

              {/* 참여자 이름을 사진 위에 둔다. 대조하려면 함께 보여야 한다. */}
              <p className="cert-participants">{c.participants.join(', ')}</p>

              {c.photoUrls.length > 0 ? (
                <div className="cert-photos">
                  {c.photoUrls.map((url, i) => (
                    <figure key={url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={PHOTO_LABELS[c.activityType]?.[i] ?? '활동 사진'}
                        loading="lazy"
                      />
                      <figcaption>
                        {PHOTO_LABELS[c.activityType]?.[i] ?? `사진 ${i + 1}`}
                      </figcaption>
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

              {/* §6.4 주제와 무관한 활동. 기본 점수 대신 2점만 붙는다.
                  팀이 스스로 고르게 하지 않는다 — 자기 활동을 친목으로
                  신고할 유인이 없다. */}
              <label className="cert-social">
                <input
                  type="checkbox"
                  checked={social.includes(c.id)}
                  onChange={() => toggleSocial(c.id)}
                />
                <span>
                  주제와 무관한 친목 활동
                  <em>기본 10점 대신 초과분 2점만 붙어요</em>
                </span>
              </label>

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
                  onClick={() => approve(c)}
                >
                  {c.outputLink ? '승인 · 산출물 평가' : '승인'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* §6.6 산출물 등급. 전체 기간 5회 한도는 점수를 넣을 때
          계산하므로 여기서는 등급만 고른다. */}
      <Sheet open={!!grading} onClose={() => setGrading(null)} labelledBy="cert-gd">
        <h2 className="sheet-title" id="cert-gd">
          산출물을 어떻게 볼까요?
        </h2>
        <p className="sheet-sub" style={{ textAlign: 'center', marginBottom: 16 }}>
          전체 기간 5회까지 인정돼요. 한도를 넘으면 점수가 붙지 않아요.
        </p>
        {DELIVERABLE_GRADES.map((g) => (
          <button
            key={g.value}
            type="button"
            className="opt"
            onClick={() => {
              const t = grading!;
              setGrading(null);
              run(t, true, undefined, g.value);
            }}
          >
            {g.label}
            <em className="opt-hint">{g.hint}</em>
          </button>
        ))}
      </Sheet>

      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} labelledBy="cert-rj">
        <h2 className="sheet-title" id="cert-rj">
          어떤 점이 문제인가요?
        </h2>
        <p className="sheet-sub" style={{ textAlign: 'center', marginBottom: 16 }}>
          고른 사유가 올린 사람에게 그대로 전달돼요.
        </p>
        {CERT_REJECT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            className="opt"
            onClick={() => {
              const t = rejecting!;
              setRejecting(null);
              run(t, false, r);
            }}
          >
            {r}
          </button>
        ))}
      </Sheet>
    </>
  );
}
