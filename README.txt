Docker 배포 구성

■ 신규
  Dockerfile                  4단계 (deps / builder / runner / migrator)
  .dockerignore
  docker-compose.yml          운영 — Caddy + Next.js + Postgres
  docker-compose.dev.yml      로컬 — Postgres만
  Caddyfile                   HTTPS 자동 발급 + 리버스 프록시
  deploy.sh                   배포 (백업 → 빌드 → 마이그레이션 → 기동 → 확인)
  backup.sh                   pg_dump → gzip → S3
  restore.sh                  복원 (확인 문구 입력 필요)
  .env.production.example
  DEPLOY.md                   서버 준비부터 운영까지
  next.config.ts              output: 'standalone'
  app/api/health/route.ts     DB까지 확인하는 상태 점검
  public/manifest.webmanifest ★ 레이아웃이 가리키는데 없어서 404였습니다
  public/robots.txt           씨앗판이 공개라 색인될 수 있어 막아 둠
  public/ICONS.txt            필요한 아이콘 안내

■ 수정
  drizzle.config.ts           컨테이너에서도 동작하는 이유를 주석으로

■ 배포
  cp .env.production.example .env.production   # 채우기
  ./deploy.sh

  자세한 절차는 DEPLOY.md 를 보세요.

■ 확인한 것
  standalone 빌드 70MB, server.js 생성
  정적 자산 서빙 200 (Dockerfile의 static/public 복사 경로가 맞다는 뜻)
  /api/health 가 DB 장애를 503으로 잡음
  비로그인 페이지 200, 보호 페이지는 /login 으로 307
  compose 의존 순서 db → migrate → app → caddy
  셸 스크립트 3개 문법 검사 통과

src/ 구조면 app/api/health/route.ts 만 src/ 아래로, 나머지는 루트입니다.
