'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { RecipientPicker } from './recipient-picker';
import { sendNoticeAction } from '../actions';
import type { NotifyAudience, Recipient } from '@/lib/db/queries/admin-ops';

/**
 * 공지 작성.
 *
 * 대상 인원 수를 버튼에 함께 보여준다. 몇 명에게 가는지 모른 채
 * 보내기를 누르게 하면 안 된다 — 되돌릴 수 없는 조작이다.
 */
export function NoticeForm({
  audiences,
}: {
  audiences: { value: NotifyAudience; label: string; hint: string; count: number }[];
}) {
  const [audience, setAudience] = useState<NotifyAudience>('all');
  const [picked, setPicked] = useState<Recipient[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const target = audiences.find((a) => a.value === audience);
  // 직접 고르기는 미리 셀 수 없다. 고른 만큼이 대상이다.
  const count = audience === 'custom' ? picked.length : (target?.count ?? 0);

  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendNoticeAction(
        audience,
        title,
        body,
        link,
        picked.map((p) => p.id),
      );
      setConfirming(false);
      if (r.error) {
        setError(r.error);
        return;
      }
      setSent(r.sent ?? 0);
      setTitle('');
      setBody('');
      setLink('');
      setPicked([]);
    });

  return (
    <div className="createform">
      {error && <Notice>{error}</Notice>}
      {sent !== null && <Notice tone="info">{sent}명에게 보냈어요.</Notice>}

      <section className="fgroup">
        <h2 className="fgroup-title">받는 사람</h2>
        <div className="pickrow" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          {audiences.map((a) => (
            <label key={a.value} className="pickopt" data-on={audience === a.value}>
              <input
                type="radio"
                name="audience"
                checked={audience === a.value}
                onChange={() => setAudience(a.value)}
                className="sr-only"
              />
              <b>
                {a.label}{' '}
                {a.value !== 'custom' && <span className="pickopt-n">{a.count}명</span>}
              </b>
              <span>{a.hint}</span>
            </label>
          ))}
        </div>

        {audience === 'custom' && (
          <RecipientPicker selected={picked} onChange={setPicked} />
        )}
      </section>

      <section className="fgroup">
        <h2 className="fgroup-title">내용</h2>

        <div className="field">
          <label className="field-label" htmlFor="n-title">
            제목
          </label>
          <input
            id="n-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            placeholder="예: 모집이 오늘 마감돼요"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="n-body">
            내용
          </label>
          <textarea
            id="n-body"
            className="input textarea"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={200}
            placeholder="알림함에 그대로 보여요."
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="n-link">
            눌렀을 때 갈 곳 <em>선택</em>
          </label>
          <input
            id="n-link"
            className="input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/connects"
          />
          <p className="field-hint">사이트 안의 경로만 넣을 수 있어요.</p>
        </div>
      </section>

      <div className="createform-foot">
        {confirming ? (
          <div className="confirm-row">
            <p className="field-hint">
              <b>
                {target?.label} {count}명
              </b>
              에게 보냅니다. 되돌릴 수 없어요.
            </p>
            <div className="actionbar-row">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                취소
              </button>
              <button type="button" className="btn" onClick={send} disabled={pending}>
                {pending ? '보내는 중…' : '보내기'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--block"
            disabled={!title.trim() || !body.trim() || count === 0}
            onClick={() => setConfirming(true)}
          >
            {count}명에게 보내기
          </button>
        )}
      </div>
    </div>
  );
}
