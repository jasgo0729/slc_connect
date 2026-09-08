#!/usr/bin/env bash
#
# 백업 복원
#
#   ./restore.sh backups/connect-20260914-040000.sql.gz
#
# 되돌릴 수 없는 작업이다. 현재 DB의 내용이 사라진다.
# 실행 전에 지금 상태를 한 번 더 백업한다.
#
set -Eeuo pipefail
cd "$(dirname "$0")"

FILE="${1:-}"
[ -n "$FILE" ] || { echo "사용법: ./restore.sh <백업파일.sql.gz>" >&2; exit 1; }
[ -f "$FILE" ] || { echo "파일을 찾을 수 없습니다: $FILE" >&2; exit 1; }

# shellcheck disable=SC1091
set -a; . ./.env.production; set +a
PGUSER="${POSTGRES_USER:-connect}"
PGDB="${POSTGRES_DB:-connect}"

echo "복원할 파일: $FILE"
echo "대상 DB    : $PGDB"
echo
echo "현재 데이터가 모두 사라집니다."
printf "계속하려면 '복원' 을 입력하세요: "
read -r answer
[ "$answer" = "복원" ] || { echo "취소했습니다."; exit 1; }

echo "안전을 위해 현재 상태를 먼저 백업합니다…"
./backup.sh --quiet

echo "앱을 잠시 내립니다…"
docker compose stop app

echo "복원 중…"
gunzip -c "$FILE" | docker compose exec -T db psql -U "$PGUSER" -d "$PGDB" -q

echo "앱을 다시 띄웁니다…"
docker compose up -d app

echo "완료했습니다."
