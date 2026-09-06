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
      \( -iname '*.tar.gz' -o -iname '*.tgz' \) -print 2>/dev/null || true
  done | sort -u
)
