'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { setSeasonAction } from '../actions';

type Field = {
  key: string;
  label: string;
  hint: string;
  type: 'date' | 'select';
  options?: readonly { value: string; label: string }[];
};

/** 항목마다 따로 저장한다. 한 번에 저장하면 어느 값을 바꿨는지 기록이 뭉개진다. */
export function SeasonForm({
  fields,
  values,
}: {
  fields: readonly Field[];
  values: Record<string, string>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (key: string) =>
    start(async () => {
      await setSeasonAction(key, draft[key] ?? '');
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    });

  return (
    <div className="createform">
      {fields.map((f) => (
        <section key={f.key} className="fgroup">
          <h2 className="fgroup-title">{f.label}</h2>
          <p className="fgroup-hint">{f.hint}</p>

          <div className="field">
            {f.type === 'select' ? (
              <select
                className="input"
                value={draft[f.key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                aria-label={f.label}
              >
                <option value="">선택 안 함</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="date"
                className="input"
                value={draft[f.key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                aria-label={f.label}
              />
            )}
          </div>

          <div className="season-save">
            {saved === f.key && <Notice tone="info">저장했어요.</Notice>}
            <button
              type="button"
              className="btn btn--line btn--sm"
              disabled={pending || (draft[f.key] ?? '') === (values[f.key] ?? '')}
              onClick={() => save(f.key)}
            >
              저장
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
