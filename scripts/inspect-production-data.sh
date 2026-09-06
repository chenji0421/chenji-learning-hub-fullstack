#!/usr/bin/env bash
set -euo pipefail

echo "=== Chenji production data inventory ==="

signature_pattern='articles|plans|note_items|plan_time_blocks|plan_completion_records'

inspect_db() {
  local db_path="$1"
  python3 - "$db_path" <<'PY'
import json
import os
import sqlite3
import sys

path = sys.argv[1]
result = {
    "path": path,
    "size": os.path.getsize(path),
    "tables": {},
}

try:
    connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    tables = [
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    for table in tables:
        escaped = table.replace('"', '""')
        result["tables"][table] = connection.execute(
            f'SELECT COUNT(*) FROM "{escaped}"'
        ).fetchone()[0]
    connection.close()
except Exception as exc:
    result["error"] = type(exc).__name__

signature_tables = {
    "articles",
    "plans",
    "note_items",
    "plan_time_blocks",
    "plan_completion_records",
}
if signature_tables.intersection(result["tables"]):
    payload = json.dumps(result, ensure_ascii=False, sort_keys=True)
    print(payload)
    print(f"::notice title=Chenji database inventory::{payload}")
PY
}

echo "=== Live backend database ==="
if docker ps --format '{{.Names}}' | grep -qx 'chenji_hub_backend'; then
  docker exec -i chenji_hub_backend python - <<'PY' || true
import json

from sqlalchemy import inspect, text

from app.config import settings
from app.database import engine

signature_tables = [
    "about_profiles",
    "articles",
    "body_weight_records",
    "diet_records",
    "exercise_records",
    "note_items",
    "note_sections",
    "plan_completion_records",
    "plan_time_blocks",
    "plans",
    "sleep_records",
    "users",
]

database_url = settings.database_url or ""
result = {
    "container": "chenji_hub_backend",
    "database_scheme": database_url.split(":", 1)[0] if ":" in database_url else "unset",
    "tables": {},
}

try:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.connect() as connection:
        for table in signature_tables:
            if table in existing_tables:
                result["tables"][table] = connection.execute(
                    text(f'SELECT COUNT(*) FROM "{table}"')
                ).scalar_one()
except Exception as exc:
    result["error"] = type(exc).__name__

payload = json.dumps(result, ensure_ascii=False, sort_keys=True)
print(payload)
print(f"::notice title=Chenji live database::{payload}")
PY
else
  echo "chenji_hub_backend container is not running."
fi

mapfile -t data_volumes < <(docker volume ls --format '{{.Name}}' | sort)

if [ "${#data_volumes[@]}" -eq 0 ]; then
  echo "No Docker data volumes found."
else
  for volume_name in "${data_volumes[@]}"; do
    mountpoint="$(docker volume inspect --format '{{.Mountpoint}}' "$volume_name")"
    while IFS= read -r db_path; do
      echo "volume=$volume_name mountpoint=$mountpoint"
      echo "::notice title=SQLite data volume::name=$volume_name"
      inspect_db "$db_path"
    done < <(find "$mountpoint" -maxdepth 5 -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -print)
  done
fi

echo "=== Candidate backups ==="
mapfile -t filesystem_roots < <(
  findmnt -rn -t ext2,ext3,ext4,xfs,btrfs,f2fs,zfs -o TARGET | sort -u
)
if [ "${#filesystem_roots[@]}" -eq 0 ]; then
  filesystem_roots=(/)
fi

while IFS= read -r backup_path; do
  if [ "$(head -c 16 "$backup_path" 2>/dev/null || true)" = "SQLite format 3" ]; then
    inspect_db "$backup_path"
  fi
done < <(
  for filesystem_root in "${filesystem_roots[@]}"; do
    find "$filesystem_root" -xdev -type f \
      \( -iname '*.db' -o -iname '*.sqlite' -o -iname '*.sqlite3' \) \
      -size +1k -size -2G -print 2>/dev/null || true
  done | sort -u
)

while IFS= read -r archive_path; do
  if tar -tzf "$archive_path" 2>/dev/null | grep -Eqi 'chenji_hub\.db|chenji_data|uploads/notes'; then
    archive_size="$(stat -c '%s' "$archive_path")"
    echo "backup=$archive_path size=$archive_size"
    echo "::notice title=Chenji backup archive::path=$archive_path size=$archive_size"
  fi
done < <(
  for filesystem_root in "${filesystem_roots[@]}"; do
    find "$filesystem_root" -xdev -type f \
      \( -iname '*.tar.gz' -o -iname '*.tgz' -o -iname '*.tar' \) -print 2>/dev/null || true
  done | sort -u
)

while IFS= read -r dump_path; do
  dump_size="$(stat -c '%s' "$dump_path")"
  case "$dump_path" in
    *.gz)
      if gzip -cd "$dump_path" 2>/dev/null | head -c 1048576 | grep -Eqi "$signature_pattern"; then
        echo "sql-backup=$dump_path size=$dump_size"
        echo "::notice title=Chenji SQL backup::path=$dump_path size=$dump_size"
      fi
      ;;
    *)
      if head -c 1048576 "$dump_path" 2>/dev/null | grep -Eqi "$signature_pattern"; then
        echo "sql-backup=$dump_path size=$dump_size"
        echo "::notice title=Chenji SQL backup::path=$dump_path size=$dump_size"
      fi
      ;;
  esac
done < <(
  for filesystem_root in "${filesystem_roots[@]}"; do
    find "$filesystem_root" -xdev -type f \
      \( -iname '*.sql' -o -iname '*.sql.gz' -o -iname '*.dump' -o -iname '*.backup' \) \
      -size +1k -size -2G -print 2>/dev/null || true
  done | sort -u
)

echo "=== PostgreSQL containers ==="
while IFS= read -r pg_container; do
  [ -n "$pg_container" ] || continue
  echo "postgres-container=$pg_container"
  echo "::notice title=PostgreSQL container::name=$pg_container"
  docker exec -e PG_CONTAINER_NAME="$pg_container" "$pg_container" sh -lc '
    set -eu
    command -v psql >/dev/null 2>&1 || exit 0
    user="${POSTGRES_USER:-postgres}"
    psql -U "$user" -d postgres -Atc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname" 2>/dev/null |
    while IFS= read -r db; do
      [ -n "$db" ] || continue
      psql -U "$user" -d "$db" -Atc "
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '\''public'\''
          AND table_name IN (
            '\''about_profiles'\'',
            '\''articles'\'',
            '\''body_weight_records'\'',
            '\''diet_records'\'',
            '\''exercise_records'\'',
            '\''note_items'\'',
            '\''note_sections'\'',
            '\''plan_completion_records'\'',
            '\''plan_time_blocks'\'',
            '\''plans'\'',
            '\''sleep_records'\'',
            '\''users'\''
          )
        ORDER BY table_name" 2>/dev/null |
      while IFS= read -r table; do
        [ -n "$table" ] || continue
        count="$(psql -U "$user" -d "$db" -Atc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || true)"
        printf '\''postgres=%s database=%s table=%s count=%s\n'\'' "$PG_CONTAINER_NAME" "$db" "$table" "$count"
        printf '\''::notice title=PostgreSQL table count::container=%s database=%s table=%s count=%s\n'\'' "$PG_CONTAINER_NAME" "$db" "$table" "$count"
      done
    done
  ' || true
done < <(
  docker ps --format '{{.Names}}\t{{.Image}}' |
    awk 'BEGIN{IGNORECASE=1} /postgres|postgis/ {print $1}' |
    sort -u
)
