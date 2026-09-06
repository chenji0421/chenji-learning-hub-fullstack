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

print(json.dumps(result, ensure_ascii=False, sort_keys=True))
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
    while IFS= read -r db_path; do
      inspect_db "$db_path"
    done < <(find "$mountpoint" -maxdepth 5 -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -print)
    find "$mountpoint" -maxdepth 5 -type f ! \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) \
      -printf 'data-file=%p size=%s\n' | sort
  done
fi

echo "=== Candidate backups under /opt ==="
find /opt -maxdepth 6 -type f \
  \( -iname '*chenji*.db' -o -iname '*chenji*.sqlite*' -o -iname '*chenji*data*.tar.gz' -o -iname 'chenji_data.tar.gz' \) \
  -printf 'backup=%p size=%s modified=%TY-%Tm-%TdT%TH:%TM:%TS\n' 2>/dev/null | sort || true
