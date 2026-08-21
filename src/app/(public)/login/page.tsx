import { AuthShell, AuthLogo } from '@/components/auth-shell';
import { Notice } from '@/components/ui/notice';
import { IconGoogle } from '@/components/ui/icon';
import { safeNext } from '@/lib/auth/google';

/**
 * 로그인.
 *
 * 화면의 일은 하나뿐이다 — 버튼을 누르게 하는 것.
 * 오류는 무엇이 잘못됐고 어떻게 하면 되는지까지 적는다.
 */
const ERRORS: Record<string, string> = {
  oauth: '구글 로그인이 완료되지 않았어요. 다시 시도해 주세요.',
  invalid_request: '요청이 만료되었어요. 다시 시도해 주세요.',
  expired: '인증 시간이 지났어요. 처음부터 다시 진행해 주세요.',
};

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, callbackUrl } = await searchParams;
  const next = safeNext(callbackUrl);
  const href = `/api/auth/google?callbackUrl=${encodeURIComponent(next)}`;

  return (
    <AuthShell>
      <AuthLogo />
      <p className="auth-lede">
        구글 계정으로 간편하게 시작해요.
        <br />
        처음이라면 이름과 학번을 한 번만 확인합니다.
      </p>

      {error && (
        <div style={{ marginTop: 4 }}>
          <Notice>{ERRORS[error] ?? ERRORS.oauth}</Notice>
        </div>
      )}

      <div className="auth-form">
        <a href={href} className="google-btn">
          <IconGoogle />
          구글로 로그인
        </a>
        <p className="auth-tagline" style={{ marginTop: 14 }}>
          SLC 명단에 있는 분만 가입할 수 있어요
        </p>
      </div>
    </AuthShell>
  );
}
