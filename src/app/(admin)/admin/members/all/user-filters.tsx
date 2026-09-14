'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/**
 * 가입자 검색과 필터.
 *
 * 주소에 조건을 담는다. 운영 중에 "자과캠 2기 미소속" 같은 화면을
 * 다시 열 일이 잦은데, 주소만 있으면 북마크해 두고 바로 갈 수 있다.
 */
export function UserFilters({
  facets,
  current,
}: {
  facets: { cohorts: string[]; campuses: string[]; slcs: string[] };
  current: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(current.q ?? '');

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete('tab');
    router.push(`/admin/members/all?${next.toString()}`);
  };

  return (
    <div className="ufilters">
      <div className="ufilter-row">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go({ q })}
          placeholder="이름 또는 학번"
          aria-label="가입자 검색"
        />
        <button type="button" className="btn btn--sm" onClick={() => go({ q })}>
          찾기
        </button>
      </div>

      <div className="ufilter-row">
        <select
          className="input"
          value={current.cohort ?? ''}
          onChange={(e) => go({ cohort: e.target.value })}
          aria-label="기수"
        >
          <option value="">기수 전체</option>
          {facets.cohorts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={current.campus ?? ''}
          onChange={(e) => go({ campus: e.target.value })}
          aria-label="캠퍼스"
        >
          <option value="">캠퍼스 전체</option>
          {facets.campuses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={current.slc ?? ''}
          onChange={(e) => go({ slc: e.target.value })}
          aria-label="SLC"
        >
          <option value="">SLC 전체</option>
          {facets.slcs.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={current.belonging ?? ''}
          onChange={(e) => go({ belonging: e.target.value })}
          aria-label="소속 여부"
        >
          <option value="">소속 전체</option>
          <option value="in">소속됨</option>
          <option value="out">미소속</option>
        </select>
      </div>
    </div>
  );
}
