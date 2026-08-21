/**
 * 알림 박스.
 *
 * 오류는 사과하지 않고, 무엇이 잘못됐고 어떻게 하면 되는지를 말한다.
 * 로그인 오류, 결속 실패, 안내 문구가 전부 이걸 쓴다.
 */
export function Notice({
  children,
  tone = 'warn',
}: {
  children: React.ReactNode;
  tone?: 'warn' | 'info';
}) {
  return (
    <p className={`notice notice--${tone}`} role={tone === 'warn' ? 'alert' : undefined}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 4.75v3.75M8 11.1v.05"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span>{children}</span>
    </p>
  );
}
