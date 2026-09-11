'use client';

import { useEffect, useState, useTransition } from 'react';
import { IconClose, IconUser } from '@/components/ui/icon';
import { searchRecipientsAction } from '../actions';
import type { Recipient } from '@/lib/db/queries/admin-ops';

/**
 * 공지 받을 사람 고르기.
 *
 * 검색으로만 닿게 한다. 전체 목록을 펼쳐 두면 전체 선택으로
 * 대량 발송을 대신하게 되고, 그때는 대상별 발송을 나눠 둔 의미가
 * 없어진다.
 *
 * 이름이 겹칠 수 있어 학번 뒤 네 자리를 함께 보여준다.
 */
export function RecipientPicker({
  selected,
  onChange,
}: {
  selected: Recipient[];
  onChange: (next: Recipient[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Recipient[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    // 글자를 칠 때마다 조회하면 요청이 쌓인다. 잠깐 멈춘 뒤에 찾는다.
    const t = setTimeout(() => {
      start(async () => setResults(await searchRecipientsAction(q)));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const add = (r: Recipient) => {
    if (selected.some((s) => s.id === r.id)) return;
    onChange([...selected, r]);
    setQuery('');
    setResults([]);
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.id !== id));

  return (
    <div className="picker">
      <div className="field">
        <label className="field-label" htmlFor="rcp">
          받을 사람 찾기
        </label>
        <input
          id="rcp"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 학번"
          autoComplete="off"
        />
      </div>

      {query.trim() && (
        <div className="picker-results">
          {pending && <p className="picker-empty">찾는 중…</p>}
          {!pending && results.length === 0 && (
            <p className="picker-empty">찾는 사람이 없어요.</p>
          )}
          {results.map((r) => {
            const already = selected.some((s) => s.id === r.id);
            return (
              <button
                key={r.id}
                type="button"
                className="picker-row"
                disabled={already}
                onClick={() => add(r)}
              >
                <IconUser size={16} />
                <span className="picker-name">{r.name}</span>
                <span className="picker-meta">
                  {r.cohort} · {r.slc} · …{r.studentNo.slice(-4)}
                </span>
                {already && <span className="picker-added">추가됨</span>}
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="picker-selected">
          <p className="field-hint">{selected.length}명 선택됨</p>
          <div className="chips">
            {selected.map((r) => (
              <button
                key={r.id}
                type="button"
                className="chip picker-chip"
                onClick={() => remove(r.id)}
                aria-label={`${r.name} 빼기`}
              >
                {r.name}
                <IconClose size={12} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
