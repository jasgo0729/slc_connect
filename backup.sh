#!/usr/bin/env bash
#
# DB 백업
#
#   ./backup.sh              백업 후 오래된 것 정리
#   ./backup.sh --quiet      배포 스크립트가 부를 때
#
# 점수 데이터가 상금과 직결되므로 유실되면 시즌이 무효가 된다.
# 사진을 DB에 넣지 않은 이유이기도 하다 — 덤프가 무거워지면
# 백업 주기를 늘리게 되고, 그 손해를 점수 데이터가 떠안는다.
#
# cron 등록 (매일 새벽 4시)
#   0 4 * * * cd /srv/connect && ./backup.sh >> /var/log/connect-backup.log 2>&1
#
set -Eeuo pipefail
cd "$(dirname "$0")"

QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1
say() { [ "$QUIET" -eq 1 ] || echo "$@"; }

ENV_FILE=".env"
[ -f "$ENV_FILE" ] || { echo "$ENV_FILE 이 없습니다." >&2; exit 1; }

# shellcheck disable=SC1090
set -a; . "./$ENV_FILE"; set +a

PGUSER="${POSTGRES_USER:-connect}"
PGDB="${POSTGRES_DB:-connect}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DIR="./backups"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$DIR/${PGDB}-${STAMP}.sql.gz"

mkdir -p "$DIR"

say "백업 중… $FILE"
# 컨테이너 안에서 덤프하고 호스트로 흘려보낸다.
docker compose exec -T db pg_dump -U "$PGUSER" -d "$PGDB" --clean --if-exists \
  | gzip > "$FILE"

# 빈 파일이 남으면 백업이 있는 줄 알게 된다. 크기를 확인한다.
SIZE=$(wc -c < "$FILE")
if [ "$SIZE" -lt 1024 ]; then
  rm -f "$FILE"
  echo "백업 결과가 비어 있습니다. 중단합니다." >&2
  exit 1
fi
say "완료 ($(du -h "$FILE" | cut -f1))"

# S3로 올린다. 서버가 통째로 사라져도 남아야 하므로 이게 진짜 백업이다.
if [ -n "${BACKUP_S3_BUCKET:-}" ] && command -v aws >/dev/null; then
  say "S3 업로드 중…"
  aws s3 cp "$FILE" "s3://${BACKUP_S3_BUCKET}/db/$(basename "$FILE")" --only-show-errors
  say "업로드 완료"
elif [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "aws CLI가 없어 S3 업로드를 건너뜁니다." >&2
fi

# 로컬은 오래된 것을 지운다. S3에는 그대로 남는다.
find "$DIR" -name "${PGDB}-*.sql.gz" -mtime "+${KEEP_DAYS}" -delete 2>/dev/null || true
say "로컬 보관: $(find "$DIR" -name "${PGDB}-*.sql.gz" | wc -l | tr -d ' ')개"
