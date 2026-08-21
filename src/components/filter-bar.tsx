import Link from 'next/link';

/**
 * B-04 트랙 탭 · B-05 필터 · B-06 정렬.
 *
 * 상태를 전부 URL에 담는다. 새로고침에도 남고, 필터를 건 화면을
 * 그대로 링크로 넘길 수 있고, 로그인 후 돌아와도 같은 화면이다.
 *
 * '마감임박'을 넣지 않은 이유 — 모집 마감일이 전 커넥트 공통이라
 * 남은 시간으로는 정렬이 성립하지 않는다. 대신 '자리 적은 순'이
 * 같은 목적을 정확한 기준으로 수행한다.
 */

export interface Filters {
  track?: string;
  campus?: string;
  sort?: string;
}

const TRACKS = [
  { value: '', label: '전체' },
  { value: 'quantitative', label: '정량' },
  { value: 'qualitative', label: '정성' },
];

const CAMPUS = [
  { value: '', label: '두 캠퍼스' },
  { value: '인문사회', label: '인사캠' },
  { value: '자연과학', label: '자과캠' },
];

const SORTS = [
  { value: '', label: '최신' },
  { value: 'spots', label: '자리 적은 순' },
  { value: 'popular', label: '인기' },
];

function href(current: Filters, patch: Partial<Filters>) {
  const next = { ...current, ...patch };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/connects?${s}` : '/connects';
}

export function FilterBar({ filters }: { filters: Filters }) {
  return (
    <div className="filters">
      <div className="tabs" role="tablist" aria-label="트랙">
        {TRACKS.map((t) => (
          <Link
            key={t.value}
            href={href(filters, { track: t.value })}
            className="tab"
            role="tab"
            aria-selected={(filters.track ?? '') === t.value}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="chips">
        {CAMPUS.map((c) => (
          <Link
            key={c.value}
            href={href(filters, { campus: c.value })}
            className="chip"
            aria-pressed={(filters.campus ?? '') === c.value}
          >
            {c.label}
          </Link>
        ))}
        <span className="chips-sep" aria-hidden="true" />
        {SORTS.map((s) => (
          <Link
            key={s.value}
            href={href(filters, { sort: s.value })}
            className="chip"
            aria-pressed={(filters.sort ?? '') === s.value}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
