#!/usr/bin/env bash
# Exercise backup/restore with synthetic records inside the CI PostgreSQL container.
set -euo pipefail
export MSYS_NO_PATHCONV=1
container="${1:?Pass the isolated PostgreSQL container ID}"
suffix="$(date +%s)_${RANDOM}"
source_db="tenvora_recovery_source_${suffix}"
target_db="tenvora_recovery_target_${suffix}"
archive="/tmp/tenvora_recovery_${suffix}.dump"
cleanup() {
  docker exec "$container" dropdb -U postgres --if-exists "$source_db" || true
  docker exec "$container" dropdb -U postgres --if-exists "$target_db" || true
  docker exec "$container" rm -f "$archive" || true
}
trap cleanup EXIT
docker exec "$container" createdb -U postgres "$source_db"
docker exec "$container" createdb -U postgres "$target_db"
docker exec "$container" psql -U postgres -d "$source_db" -v ON_ERROR_STOP=1 -c \
  'CREATE TABLE recovery_check (id integer PRIMARY KEY, total numeric(18,4), paid numeric(18,4)); INSERT INTO recovery_check VALUES (1, 100.0000, 60.0000);'
docker exec "$container" pg_dump -U postgres -Fc -f "$archive" "$source_db"
docker exec "$container" pg_restore -U postgres --exit-on-error -d "$target_db" "$archive"
result="$(docker exec "$container" psql -U postgres -d "$target_db" -Atc 'SELECT count(*) = 1 AND sum(total-paid) = 40.0000 FROM recovery_check;')"
test "$result" = t
echo 'PostgreSQL synthetic backup/restore verification passed.'
