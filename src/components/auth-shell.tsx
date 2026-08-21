/**
 * 인증 화면 껍데기.
 *
 * 모바일에서는 단일 컬럼, 900px 이상에서는 왼쪽에 Negative 테마 패널이
 * 서고 오른쪽에 폼이 놓인다. 브랜드 가이드의 두 테마를 한 화면에서
 * 만나게 하는 자리이기도 하다.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <p className="brand" style={{ color: 'var(--on-dark)' }}>
          <span style={{ color: 'var(--s25)' }}>CROSS-SLC</span>{' '}
          <span style={{ color: 'var(--blue-soft)' }}>CONNECT</span>
        </p>
        <div>
          <p className="auth-side-copy">
            SLC를 넘나드는
            <br />
            삼성 장학생들의 연결
          </p>
          <p className="auth-side-sub">
            관심사가 겹치는 4~7명이 한 학기를 함께 보냅니다. 무엇을 할지 정해 두지 않았어도
            괜찮습니다. 고르는 것부터가 시작입니다.
          </p>
        </div>
        <p style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--on-dark-dim)' }}>
          SAMSUNG LEADERS CLUB · PRISM
        </p>
      </aside>

      <div className="auth-main">
        <div className="auth-inner">{children}</div>
      </div>
    </div>
  );
}

export function AuthLogo() {
  return (
    <>
      <p className="auth-logo">
        <span className="brand-a">Cross-SLC</span> <span className="brand-b">Connect</span>
      </p>
      <p className="auth-tagline">SLC를 넘나드는 삼성 장학생들의 연결</p>
    </>
  );
}
