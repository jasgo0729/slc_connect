#!/usr/bin/env bash
#
# Cross-SLC Connect 배포
#
#   ./deploy.sh              .env 의 설정대로 배포
#   ./deploy.sh --http       Caddy 없이 앱을 80번에 직접 (테스트용)
#   ./deploy.sh --no-pull    이미 받아 둔 코드로 배포
#   ./deploy.sh --logs       배포 후 로그 따라가기
#
# 하는 일
#   1. 배포 전 DB 백업 (되돌릴 수 있어야 배포할 수 있다)
#   2. 코드 받기
#   3. 이미지 빌드
#   4. 마이그레이션 → 앱 → Caddy 순서로 기동
#   5. 상태 확인. 실패하면 멈추고 로그를 보여준다.
#
set -Eeuo pipefail

cd "$(dirname "$0")"

COMPOSE="docker compose"
ENV_FILE=".env"
HEALTH_RETRIES=30
HEALTH_INTERVAL=2

PULL=1
FOLLOW=0
FORCE_HTTP=0
for arg in "$@"; do
  case "$arg" in
    --http) FORCE_HTTP=1 ;;
    --no-pull) PULL=0 ;;
    --logs) FOLLOW=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "알 수 없는 옵션: $arg" >&2; exit 1 ;;
  esac
done

# ── 출력 ──────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m')
  RED=$(printf '\033[31m'); GREEN=$(printf '\033[32m'); OFF=$(printf '\033[0m')
else
  BOLD=""; DIM=""; RED=""; GREEN=""; OFF=""
fi
step() { echo "${BOLD}▸ $*${OFF}"; }
info() { echo "  ${DIM}$*${OFF}"; }
fail() { echo "${RED}✗ $*${OFF}" >&2; exit 1; }
done_() { echo "${GREEN}✓ $*${OFF}"; }

# 실패한 지점을 알려 준다. set -e 로 조용히 죽으면 원인을 찾기 어렵다.
trap 'echo "${RED}✗ ${BASH_SOURCE[0]}:${LINENO} 에서 실패했습니다.${OFF}" >&2' ERR

# ── 준비 확인 ─────────────────────────────────────────────
step "환경 확인"

command -v docker >/dev/null || fail "docker 가 설치되어 있지 않습니다."
docker compose version >/dev/null 2>&1 || fail "docker compose (v2) 가 필요합니다."
[ -f "$ENV_FILE" ] || fail "$ENV_FILE 이 없습니다. .env.production.example 을 복사해 채워주세요."

# 값이 비어 있으면 빌드는 되지만 실행 시점에 터진다. 여기서 먼저 막는다.
missing=()
for key in DATABASE_URL APP_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET POSTGRES_PASSWORD; do
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- || true)
  [ -n "${value//[[:space:]]/}" ] || missing+=("$key")
done
[ ${#missing[@]} -eq 0 ] || fail "$ENV_FILE 에 값이 비어 있습니다: ${missing[*]}"

APP_URL_VALUE=$(grep -E '^APP_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')
DOMAIN_VALUE=$(grep -E '^DOMAIN=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true)

# 모드 결정. --http 를 주거나 APP_URL 이 http:// 면 Caddy 없이 띄운다.
if [ "$FORCE_HTTP" -eq 1 ] || [ "${APP_URL_VALUE#http://}" != "$APP_URL_VALUE" ]; then
  MODE="http"
  PROFILE=()
  export APP_BIND="${APP_BIND:-0.0.0.0:80}"
else
  MODE="https"
  PROFILE=(--profile https)
  [ -n "${DOMAIN_VALUE//[[:space:]]/}" ] || fail "HTTPS 모드인데 DOMAIN 이 비어 있습니다."
fi

# APP_URL 끝의 슬래시는 리디렉트 주소를 //api/... 로 만든다.
case "$APP_URL_VALUE" in
  */) fail "APP_URL 끝의 / 를 지워주세요: $APP_URL_VALUE" ;;
esac

if [ "$MODE" = "http" ]; then
  info "HTTP 모드 — Caddy 없이 앱이 ${APP_BIND} 를 받습니다."
  info "웹 푸시(H-01)와 홈 화면 추가(H-04)는 HTTPS에서만 동작합니다."
  # 쿠키 secure 는 APP_URL 프로토콜을 따른다. https 로 적어 두면
  # HTTP 응답의 쿠키를 브라우저가 버려 로그인이 조용히 실패한다.
  case "$APP_URL_VALUE" in
    https://*) fail "HTTP 모드인데 APP_URL 이 https 입니다. http:// 로 바꿔주세요." ;;
  esac
else
  info "HTTPS 모드 — Caddy가 ${DOMAIN_VALUE} 인증서를 발급합니다."
fi
done_ "확인 완료 (${MODE})"

# ── 백업 ──────────────────────────────────────────────────
# 되돌릴 수 없는 배포는 하지 않는다. 점수 데이터가 상금과 직결된다.
if $COMPOSE ps --status running --services 2>/dev/null | grep -qx db; then
  step "배포 전 백업"
  ./backup.sh --quiet && done_ "백업 완료" || fail "백업에 실패해 배포를 멈춥니다."
else
  info "DB가 아직 없어 백업을 건너뜁니다. (첫 배포)"
fi

# ── 코드 ──────────────────────────────────────────────────
if [ "$PULL" -eq 1 ] && [ -d .git ]; then
  step "코드 받기"
  before=$(git rev-parse --short HEAD)
  git pull --ff-only
  after=$(git rev-parse --short HEAD)
  if [ "$before" = "$after" ]; then
    info "변경 없음 ($after)"
  else
    info "$before → $after"
    git --no-pager log --oneline "$before..$after" | head -10 | sed 's/^/    /'
  fi
fi

# ── 빌드 ──────────────────────────────────────────────────
step "이미지 빌드"
$COMPOSE build app migrate
done_ "빌드 완료"

# ── 기동 ──────────────────────────────────────────────────
# compose 의 depends_on 이 db → migrate → app → caddy 순서를 보장한다.
# 마이그레이션이 실패하면 앱이 아예 뜨지 않는다.
step "마이그레이션"
$COMPOSE up -d db
$COMPOSE run --rm migrate || fail "마이그레이션에 실패했습니다. 앱을 띄우지 않았습니다."
done_ "마이그레이션 완료"

step "기동"
$COMPOSE "${PROFILE[@]}" up -d --remove-orphans
done_ "컨테이너 기동"

# ── 상태 확인 ─────────────────────────────────────────────
step "상태 확인"
for i in $(seq 1 $HEALTH_RETRIES); do
  if $COMPOSE exec -T app node -e \
      "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
    done_ "정상 응답 확인"
    break
  fi
  if [ "$i" -eq "$HEALTH_RETRIES" ]; then
    echo "${RED}--- app 로그 ---${OFF}" >&2
    $COMPOSE logs --tail=60 app >&2
    fail "앱이 응답하지 않습니다."
  fi
  sleep $HEALTH_INTERVAL
done

# 쓰지 않는 이전 이미지를 정리한다. 배포를 반복하면 디스크가 찬다.
step "정리"
docker image prune -f >/dev/null
info "$(docker system df --format '{{.Type}} {{.Size}}' 2>/dev/null | tr '\n' ' ')"

echo
done_ "배포 완료 — ${APP_URL_VALUE}"
$COMPOSE "${PROFILE[@]}" ps

if [ "$FOLLOW" -eq 1 ]; then
  echo
  $COMPOSE logs -f app
fi
