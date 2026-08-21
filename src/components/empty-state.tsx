import Link from 'next/link';

/** B-10 필터 결과 0건. 빈 화면은 다음 행동을 권하는 자리다. */
export function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset?: () => void }) {
  return (
    <div className="empty">
      <p className="empty-title">
        {hasFilters ? '조건에 맞는 커넥트가 없어요' : '아직 열린 커넥트가 없어요'}
      </p>
      <p className="empty-detail">
        {hasFilters
          ? '조건을 풀면 다른 커넥트가 보입니다. 찾는 게 없으면 직접 만들어도 됩니다.'
          : '모집이 시작되면 여기에 커넥트가 쌓입니다.'}
      </p>
      <div className="empty-actions">
        {hasFilters && onReset && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            조건 지우기
          </button>
        )}
        <Link href="/connects/new" className="btn btn--sm">
          커넥트 만들기
        </Link>
      </div>
    </div>
  );
}
