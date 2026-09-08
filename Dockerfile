# =========================================================
# Cross-SLC Connect
#
# 세 단계로 나눈다.
#   deps    — 의존성만. package.json이 바뀌지 않으면 캐시가 살아 있다.
#   builder — 빌드. 여기서 나온 standalone 결과만 다음 단계로 넘긴다.
#   runner  — 실행. 개발 의존성과 소스가 없어 이미지가 작고 공격면이 좁다.
#
# migrator 는 별도 최종 단계다. drizzle-kit이 개발 의존성이라
# runner 에는 없기 때문에, 마이그레이션 전용 이미지를 따로 둔다.
# =========================================================

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── 빌드 ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시점에는 DB에 붙지 않는다. 모든 페이지가 force-dynamic 이라
# 프리렌더 중 쿼리가 실행되지 않지만, 값이 없으면 모듈 로딩에서 터진다.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── 실행 ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TZ=Asia/Seoul

RUN apk add --no-cache tzdata curl \
  && addgroup -g 1001 -S nodejs \
  && adduser -u 1001 -S nextjs -G nodejs

# standalone 은 서버 실행에 필요한 것만 담고 있다.
# static 과 public 은 따로 복사해야 한다.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

# ── 마이그레이션 전용 ─────────────────────────────────────
# drizzle-kit 과 스키마 파일이 필요하다. 앱을 띄우기 전에 한 번 돌고 끝난다.
FROM node:22-alpine AS migrator
WORKDIR /app
ENV TZ=Asia/Seoul
RUN apk add --no-cache tzdata
COPY --from=deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY lib ./lib
CMD ["npx", "drizzle-kit", "migrate"]
