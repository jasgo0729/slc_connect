'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { MANUAL_ADJUSTMENT_LIMIT } from '@/lib/scoring/rules';
import { formatWeek } from '@/lib/scoring/week';
import { adjustScoreAction, deleteAdjustmentAction } from './actions';

/**
 * 수동 점수 정정.
 *
 * 규칙서 §6 은 인증을 거친 활동만 다룬다. 그 밖의 점수 — 운영진이
 * 인정한 특별 활동, 잘못 준 점수의 회수 — 는 여기서 넣는다.
 *
 * 세 가지를 화면에서 분명히 한다.
 *  1. 사유가 팀에게 그대로 보인다. 내부 메모처럼 쓰면 학생이 읽는다.
 *  2. 수동 정정만 지울 수 있다. 계산으로 붙은 점수는 지워도 다음
 *     재계산에서 되살아나므로 아예 손댈 수 없게 둔다.
 *  3. 고치기는 '지우고 다시 넣기'다. 고친 흔적이 남지 않는 수정보다
 *     감사 로그에 두 줄이 남는 편이 낫다.
 */
interface ManualRow {
  id: string;
  connectId: string;
  connectName: string;
  points: number;
  weekStart: string;
  reason: string | null;
  byName: string | null;
}

export function ManualPanel({
  connects,
  rows,
}: {
  connects: { id: string; name: string }[];
  rows: ManualRow[];
}) {
  const [connectId, setConnectId] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      setMsg(null);

      const n = Number(points);
      if (!connectId) return setError('커넥트를 골라주세요.');
      if (!Number.isFinite(n) || n === 0) return setError('0이 아닌 점수를 적어주세요.');
      if (reason.trim().length < 2) return setError('정정 사유를 적어주세요.');

      const r = await adjustScoreAction({
        connectId,
        points: n,
        reason: reason.trim(),
        weekStart: weekStart || undefined,
      });

      // 실패하면 입력을 그대로 둔다. 고쳐서 다시 낼 수 있어야 한다.
      if (r.error) return setError(r.error);

      setMsg(`${n > 0 ? '+' : ''}${n}점을 넣었어요.`);
      setPoints('');
      setReason('');
    });

  const remove = (row: ManualRow) =>
    start(async () => {
      setError(null);
      setMsg(null);
      setConfirming(null);

      const r = await deleteAdjustmentAction(row.id, row.connectId);
      if (r.error) return setError(r.error);
      setMsg('정정을 지웠어요.');
    });

  return (
    <>
      <h2 className="section-title" style={{ marginTop: 28 }}>
        수동 정정
      </h2>
      <p className="field-hint" style={{ marginTop: 0 }}>
        인증으로 낼 수 없는 점수를 직접 넣어요. 재계산해도 지워지지 않아요.
      </p>

      {error && <Notice>{error}</Notice>}
      {msg && <Notice>{msg}</Notice>}

      <div className="adjust-form">
        <label className="adjust-field">
          <span>커넥트</span>
          <select value={connectId} onChange={(e) => setConnectId(e.target.value)}>
            <option value="">고르세요</option>
            {connects.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="adjust-field adjust-field--narrow">
          <span>점수</span>
          <input
            type="number"
            inputMode="numeric"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="10 또는 -5"
            max={MANUAL_ADJUSTMENT_LIMIT}
            min={-MANUAL_ADJUSTMENT_LIMIT}
          />
        </label>

        <label className="adjust-field adjust-field--narrow">
          <span>주차 (선택)</span>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </label>

        <label className="adjust-field adjust-field--wide">
          <span>사유 — 팀에게 그대로 보여요</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 체육대회 우승 / 중복 인증 회수"
            maxLength={200}
          />
        </label>

        <button type="button" className="btn btn--sm" onClick={submit} disabled={pending}>
          {pending ? '넣는 중…' : '점수 넣기'}
        </button>
      </div>

      <p className="field-hint">
        한 번에 {MANUAL_ADJUSTMENT_LIMIT}점까지예요. 주차를 비우면 이번 주에 들어가고, 날짜를
        고르면 그 날이 속한 주로 들어가요.
      </p>

      {rows.length === 0 ? (
        <p className="mini-empty">아직 수동 정정이 없어요.</p>
      ) : (
        <ul className="adjust-list">
          {rows.map((r) => (
            <li key={r.id}>
              <span className="adjust-week">{formatWeek(r.weekStart)}</span>
              <span className="adjust-connect">{r.connectName}</span>
              <span className="adjust-reason">
                {r.reason}
                {r.byName && <em> · {r.byName}</em>}
              </span>
              <span className="adjust-points" data-minus={r.points < 0}>
                {r.points > 0 ? '+' : ''}
                {r.points}
              </span>

              {confirming === r.id ? (
                <span className="adjust-confirm">
                  <button
                    type="button"
                    className="textbtn"
                    onClick={() => setConfirming(null)}
                    disabled={pending}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => remove(r)}
                    disabled={pending}
                  >
                    지우기
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="textbtn"
                  onClick={() => setConfirming(r.id)}
                  disabled={pending}
                >
                  지움
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
