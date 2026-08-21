'use client';

import { Sheet } from './ui/sheet';

/**
 * B-05 필터 · B-06 정렬.
 *
 * 모바일에서는 바텀시트, 데스크탑에서는 왼쪽 기둥(.filter-rail)에 펼쳐진다.
 * 선택지 정의를 한 곳에 두고 두 화면이 같은 배열을 읽는다.
 */

export const STATUS_OPTS = [
  { value: '', label: '전체' },
  { value: 'recruiting', label: '모집 중' },
  { value: 'full_closed', label: '마감' },
  { value: 'pending_review', label: '정성 확인 대기' },
];

export const CAMPUS_OPTS = [
  { value: '', label: '전체' },
  { value: '인문사회', label: '인문사회과학캠퍼스' },
  { value: '자연과학', label: '자연과학캠퍼스' },
  { value: '공통', label: '공통' },
];

/**
 * '마감임박'을 두지 않은 이유 — 모집 마감일이 전 커넥트 공통이라
 * 남은 시간으로는 정렬이 성립하지 않는다. 남은 자리 수가 같은 목적을
 * 정확한 기준으로 수행한다.
 */
export const SORT_OPTS = [
  { value: '', label: '최신순', hint: '기본값' },
  { value: 'spots', label: '자리 적은 순', hint: '남은 자리 오름차순' },
  { value: 'popular', label: '인기순', hint: '찜 많은 순' },
];

export interface Filters {
  status?: string;
  campus?: string;
  openOnly?: boolean;
  sort?: string;
}

function Radio({
  checked,
  label,
  hint,
  onSelect,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="opt" role="radio" aria-checked={checked} onClick={onSelect}>
      <span className="radio" aria-hidden="true" />
      <span>
        {label}
        {hint && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> ({hint})</span>}
      </span>
    </button>
  );
}

export function FilterSheet({
  open,
  filters,
  onClose,
  onApply,
  onReset,
  onChange,
}: {
  open: boolean;
  filters: Filters;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  onChange: (patch: Partial<Filters>) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="filter-title">
      <h2 className="sheet-title" id="filter-title">
        필터
      </h2>

      <div className="sheet-group" role="radiogroup" aria-label="모집 상태">
        <p className="sheet-label">모집 상태</p>
        {STATUS_OPTS.map((o) => (
          <Radio
            key={o.value}
            checked={(filters.status ?? '') === o.value}
            label={o.label}
            onSelect={() => onChange({ status: o.value })}
          />
        ))}
      </div>

      <div className="sheet-group" role="radiogroup" aria-label="캠퍼스">
        <p className="sheet-label">캠퍼스</p>
        {CAMPUS_OPTS.map((o) => (
          <Radio
            key={o.value}
            checked={(filters.campus ?? '') === o.value}
            label={o.label}
            onSelect={() => onChange({ campus: o.value })}
          />
        ))}
      </div>

      <div className="sheet-group">
        <p className="sheet-label">남은 자리</p>
        <button
          type="button"
          className="opt"
          role="checkbox"
          aria-checked={!!filters.openOnly}
          onClick={() => onChange({ openOnly: !filters.openOnly })}
        >
          <span className="radio" aria-hidden="true" />
          자리 있음만 보기
        </button>
      </div>

      <div className="sheet-actions">
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          초기화
        </button>
        <button type="button" className="btn" onClick={onApply}>
          필터 적용
        </button>
      </div>
    </Sheet>
  );
}

export function SortSheet({
  open,
  value,
  onClose,
  onSelect,
}: {
  open: boolean;
  value?: string;
  onClose: () => void;
  onSelect: (v: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="sort-title">
      <h2 className="sheet-title" id="sort-title">
        정렬
      </h2>
      <div role="radiogroup" aria-label="정렬 기준">
        {SORT_OPTS.map((o) => (
          <Radio
            key={o.value}
            checked={(value ?? '') === o.value}
            label={o.label}
            hint={o.hint}
            onSelect={() => onSelect(o.value)}
          />
        ))}
      </div>
    </Sheet>
  );
}
