#!/usr/bin/env bash
#
# 명단 적재
#
#   ./roster.sh 명단.xlsx --dry-run     확인만 (DB에 쓰지 않음)
#   ./roster.sh 명단.xlsx               적재
#
# 실행 이미지에는 tsx·exceljs 가 없어 마이그레이터 이미지에서 돌린다.
# 같은 학번이 다시 들어오면 덮어쓰므로 명단이 갱신될 때 다시 돌려도 된다.
# 명단에서 빠진 사람은 지우지 않는다 — 이미 가입한 계정이
# users.student_no 로 물려 있기 때문이다.
#
set -Eeuo pipefail
cd "$(dirname "$0")"

FILE="${1:-}"
shift || true

if [ -z "$FILE" ]; then
  echo "사용법: ./roster.sh <엑셀파일> [--dry-run]" >&2
  exit 1
fi
[ -f "$FILE" ] || { echo "파일을 찾을 수 없습니다: $FILE" >&2; exit 1; }
[ -f .env ] || { echo ".env 가 없습니다." >&2; exit 1; }

# 컨테이너 안 경로로 마운트한다. 한글 파일명이 섞여도 안전하게 고정된 이름을 쓴다.
ABS=$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")

docker compose run --rm --no-deps \
  -v "$ABS:/data/roster.xlsx:ro" \
  migrate npx tsx scripts/import-roster.ts /data/roster.xlsx "$@"
