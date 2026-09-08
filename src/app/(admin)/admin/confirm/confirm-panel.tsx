'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { confirmAllAction } from '../actions';
import type { ConfirmPreview } from '@/lib/db/queries/admin-ops';

/**
 * 확정 미리보기와 실행.
 *
 * 숫자가 예상과 다르면 그 자리에서 멈출 수 있어야 한다.
 * 특히 미달 팀은 확정하면 그대로 시즌을 시작하게 되므로,
 * 먼저 D-14 인원 흡수를 끝내야 한다.
 *
 * 확인 문구를 손으로 입력하게 한다. 버튼 하나로 303명의 시즌이
 * 시작되는 조작이라 실수로 누를 여지를 없앤다.
 */
const PHRASE = '확정';

export function ConfirmPanel({ preview }: { preview: ConfirmPreview }) {
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const nothing = preview.connects === 0;

  const run = () =>
    start(async () => {
      setError(null);
      const r = await confirmAllAction();
      if (r.error) {
        setError(r.error);
        return;
      }
      setResult(`커넥트 ${r.connects}곳을 확정하고 ${r.notified}명에게 알렸어요.`);
      setTyped('');
    });

  return (
    <>
      {error && <Notice>{error}</Notice>}
      {result && <Notice tone="info">{result}</Notice>}

      <div className="admin-cards" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <span className="admin-card-n">{preview.connects}</span>
          <span className="admin-card-label">확정될 커넥트</span>
        </div>
        <div className="admin-card">
          <span className="admin-card-n">{preview.members}</span>
          <span className="admin-card-label">알림 받을 인원</span>
        </div>
        <div className="admin-card" data-urgent={preview.shortConnects.length > 0}>
          <span className="admin-card-n">{preview.shortConnects.length}</span>
          <span className="admin-card-label">4명 미만 커넥트</span>
          <span className="admin-card-hint">확정하면 이대로 시작해요</span>
        </div>
      </div>

      <section className="card-block">
        <div className="kv">
          <span className="kv-key">비공개 → 공개 전환</span>
          <span className="kv-val">{preview.privateToPublic}곳</span>
        </div>
        <div className="kv">
          <span className="kv-key">정리될 대기 중 신청</span>
          <span className="kv-val">{preview.pendingApplications}건</span>
        </div>
        <div className="kv">
          <span className="kv-key">이미 확정된 커넥트</span>
          <span className="kv-val">{preview.alreadyConfirmed}곳</span>
        </div>
      </section>

      {preview.shortConnects.length > 0 && (
        <>
          <h2 className="me-sectitle me-sectitle--gap">먼저 처리할 미달 커넥트</h2>
          <section className="card-block card-block--flush">
            <ul className="audit-list">
              {preview.shortConnects.map((c) => (
                <li key={c.id}>
                  <span className="audit-action">{c.name}</span>
                  <span className="audit-detail" />
                  <span className="audit-meta">{c.memberCount}명</span>
                </li>
              ))}
            </ul>
          </section>
          <p className="field-hint" style={{ marginTop: 10 }}>
            인원 화면에서 미소속 인원과 맞춰 본 뒤 확정하는 것을 권합니다.
          </p>
        </>
      )}

      <section className="fgroup" style={{ marginTop: 24 }}>
        <h2 className="fgroup-title">실행</h2>
        <p className="fgroup-hint">
          모든 커넥트가 확정 상태로 바뀌고, 비공개 커넥트가 공개되며, 대기 중인 신청이 정리됩니다.
          참여자에게 알림이 나갑니다.
        </p>

        <div className="field">
          <label className="field-label" htmlFor="cf">
            확인을 위해 <b>{PHRASE}</b> 을(를) 입력해주세요
          </label>
          <input
            id="cf"
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={PHRASE}
            autoComplete="off"
            disabled={nothing}
          />
        </div>

        <button
          type="button"
          className="btn btn--block btn--danger"
          style={{ marginTop: 16 }}
          disabled={nothing || typed.trim() !== PHRASE || pending}
          onClick={run}
        >
          {nothing ? '확정할 커넥트가 없어요' : pending ? '처리 중…' : '모든 팀 확정하기'}
        </button>
      </section>
    </>
  );
}
