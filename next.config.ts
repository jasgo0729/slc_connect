import type { NextConfig } from 'next';

const config: NextConfig = {
  /**
   * 컨테이너 배포용. .next/standalone 에 실행에 필요한 것만 모아 준다.
   * node_modules 전체를 이미지에 넣지 않으므로 이미지가 크게 줄고,
   * 서버 한 대에 올리는 구성에서 배포 시간이 짧아진다.
   */
  output: 'standalone',

  // 리버스 프록시(Caddy) 뒤에 있으므로 X-Forwarded-* 를 신뢰한다.
  // 이걸 켜야 서버 액션이 요청 출처를 올바르게 판단한다.
  experimental: {
    serverActions: {
      allowedOrigins: process.env.APP_URL
        ? [new URL(process.env.APP_URL).host]
        : undefined,
    },
  },
};

export default config;
