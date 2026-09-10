import 'server-only';

/**
 * 쿠키·리다이렉트의 기준 주소.
 *
 * NODE_ENV 로 secure 를 판단하면 안 된다. 컨테이너는 항상
 * NODE_ENV=production 이라, HTTP로 띄운 테스트 서버에서도 secure 쿠키가
 * 발급된다. 브라우저는 HTTP 응답의 secure 쿠키를 조용히 버리므로
 * 구글 로그인은 성공하는데 세션이 남지 않아 로그인 화면으로 되돌아온다.
 * 원인을 찾기 어려운 종류의 실패다.
 *
 * 그래서 실제로 서비스되는 주소(APP_URL)의 프로토콜을 본다.
 * https 로 띄우면 secure, http 로 띄우면 아니다.
 */
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export const IS_HTTPS = APP_URL.startsWith('https://');

/** 세션처럼 오래 두는 쿠키. */
export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: IS_HTTPS,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/**
 * 절대 주소를 만든다.
 *
 * req.url 로 만들면 리버스 프록시 뒤에서 http://app:3000/... 이 된다.
 * 컨테이너 내부 주소라 브라우저가 갈 수 없고, HTTPS로 서비스하는데
 * http 로 리다이렉트되어 쿠키가 끊기기도 한다.
 */
export function appUrl(path: string): URL {
  return new URL(path, APP_URL);
}
