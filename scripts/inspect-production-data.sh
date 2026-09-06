#!/usr/bin/env bash
set -euo pipefail

echo "=== Chenji production data inventory ==="

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

payload = json.dumps(result, ensure_ascii=False, sort_keys=True)
print(payload)
print(f"::notice title=Chenji database inventory::{payload}")
PY
}

mapfile -t chenji_volumes < <(
  docker volume ls --format '{{.Name}}' | grep -Ei 'chenji.*data|data.*chenji' || true
)

if [ "${#chenji_volumes[@]}" -eq 0 ]; then
  echo "No Chenji data volumes found."
else
  for volume_name in "${chenji_volumes[@]}"; do
    mountpoint="$(docker volume inspect --format '{{.Mountpoint}}' "$volume_name")"
    echo "volume=$volume_name mountpoint=$mountpoint"
    echo "::notice title=Chenji data volume::name=$volume_name"
    while IFS= read -r db_path; do
      inspect_db "$db_path"
    done < <(find "$mountpoint" -maxdepth 5 -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -print)
    find "$mountpoint" -maxdepth 5 -type f ! \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) \
      -printf 'data-file=%p size=%s\n' | sort
  done
fi

echo "=== Candidate backups ==="
while IFS= read -r backup_path; do
  case "$backup_path" in
    *.db|*.sqlite|*.sqlite3)
      inspect_db "$backup_path"
      ;;
    *)
      backup_size="$(stat -c '%s' "$backup_path")"
      echo "backup=$backup_path size=$backup_size"
      echo "::notice title=Chenji backup candidate::path=$backup_path size=$backup_size"
      ;;
  esac
done < <(find /opt /root /home /var/backups /tmp -xdev -maxdepth 10 -type f \
  \( -iname '*.db' -o -iname '*.sqlite' -o -iname '*.sqlite3' \) \
  -print 2>/dev/null | sort || true)

while IFS= read -r archive_path; do
  if tar -tzf "$archive_path" 2>/dev/null | grep -Eqi 'chenji_hub\.db|chenji_data|uploads/notes'; then
    archive_size="$(stat -c '%s' "$archive_path")"
    echo "backup=$archive_path size=$archive_size"
    echo "::notice title=Chenji backup archive::path=$archive_path size=$archive_size"
  fi
done < <(find /opt /root /home /var/backups /tmp -xdev -maxdepth 10 -type f \
  \( -iname '*.tar.gz' -o -iname '*.tgz' \) -print 2>/dev/null | sort || true)
