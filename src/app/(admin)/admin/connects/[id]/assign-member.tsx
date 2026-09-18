'use client';

import { useEffect, useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { IconClose, IconUser } from '@/components/ui/icon';
import { assignMemberAction, removeMemberAction, searchAssignableAction } from '../../actions';
import type { AssignCandidate } from '@/lib/db/queries/assign';

/**
 * D-14 팀원 배정.
 *
 * 해산되는 팀의 인원을 자리가 남은 팀으로 옮기는 것이 주 용도다.
 * 본인이 직접 신청하게 하면 D+8~D+9의 짧은 기간에 연락이 닿지
 * 않는 사람이 생기고, 그만큼 자리가 비어 남는다.
 *
 * 이미 같은 트랙에 속한 사람은 한 번 막고 확인을 받는다.
 * 옮기는 것은 상대 팀의 인원도 줄이는 일이다.
 */
export function AssignMember({
  connectId,
  members,
}: {
  connectId: string;
  members: { userId: string; name: string; role: string }[];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssignCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirmMove, setConfirmMove] = useState<AssignCandidate | null>(null);
  const [searching, startSearch] = useTransition();
  const [pending, start] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    // 글자를 칠 때마다 조회하면 요청이 쌓인다. 잠깐 멈춘 뒤에 찾는다.
    const t = setTimeout(() => {
      startSearch(async () => setResults(await searchAssignableAction(connectId, q)));
    }, 250);
    return () => clearTimeout(t);
  }, [query, connectId]);

  const add = (c: AssignCandidate, move = false) =>
    start(async () => {
      setError(null);
      setDone(null);
      const r = await assignMemberAction(connectId, c.userId, move);

      if (r.conflictName && !move) {
        setConfirmMove(c);
        return;
      }
      setConfirmMove(null);
      if (r.error) {
        setError(r.error);
        return;
      }
      setDone(
        r.moved ? `${c.name}님을 '${r.moved}'에서 옮겨 왔어요.` : `${c.name}님을 넣었어요.`,
      );
      setQuery('');
      setResults([]);
    });

  const remove = (userId: string, name: string) =>
    start(async () => {
      setError(null);
      setDone(null);
      const r = await removeMemberAction(connectId, userId);
      if (r.error) setError(r.error);
      else setDone(`${name}님을 뺐어요.`);
    });

  return (
    <div>
      {error && <Notice>{error}</Notice>}
      {done && <Notice tone="info">{done}</Notice>}

      {/* 옮기기 확인 — 상대 팀의 인원이 줄어드는 일이다 */}
      {confirmMove && (
        <div className="warn-confirm" style={{ marginBottom: 14 }}>
          <p className="field-hint">
            <b>{confirmMove.name}</b>님은 이미 <b>{confirmMove.currentInTrack}</b>에 있어요. 거기서
            빼고 이 커넥트로 옮길까요?
          </p>
          <div className="actionbar-row">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirmMove(null)}
              disabled={pending}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => add(confirmMove, true)}
              disabled={pending}
            >
              {pending ? '옮기는 중…' : '옮기기'}
            </button>
          </div>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="assign">
          팀원 추가 <em>이름 또는 학번</em>
        </label>
        <input
          id="assign"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 학번"
          autoComplete="off"
        />
      </div>

      {query.trim() && (
        <div className="picker-results">
          {searching && <p className="picker-empty">찾는 중…</p>}
          {!searching && results.length === 0 && (
            <p className="picker-empty">찾는 사람이 없어요.</p>
          )}
          {results.map((c) => (
            <button
              key={c.userId}
              type="button"
              className="picker-row"
              disabled={pending}
              onClick={() => add(c)}
            >
              <IconUser size={16} />
              <span className="picker-name">{c.name}</span>
              <span className="picker-meta">
                {c.cohort} · {c.slc} · …{c.studentNo.slice(-4)}
              </span>
              {c.currentInTrack && <span className="picker-added">{c.currentInTrack}</span>}
            </button>
          ))}
        </div>
      )}

      {members.length > 0 && (
        <div className="assign-current">
          <p className="field-hint">현재 팀원</p>
          <div className="chips">
            {members.map((m) => (
              <span key={m.userId} className="chip picker-chip">
                {m.name}
                {m.role === 'leader' && ' (팀장)'}
                <button
                  type="button"
                  className="chip-x"
                  aria-label={`${m.name} 빼기`}
                  disabled={pending}
                  onClick={() => remove(m.userId, m.name)}
                >
                  <IconClose size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
