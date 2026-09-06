#!/usr/bin/env bash
set -euo pipefail

echo "=== Chenji production data inventory ==="

if ! docker ps --format '{{.Names}}' | grep -qx 'chenji_hub_backend'; then
  echo "chenji_hub_backend container is not running."
  exit 0
fi

docker exec -i chenji_hub_backend python - <<'PY' || true
import json

from sqlalchemy import inspect, text

from app.config import settings
from app.database import engine

tables = [
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
    "database_scheme": database_url.split(":", 1)[0] if ":" in database_url else "unset",
    "tables": {},
}

try:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.connect() as connection:
        for table in tables:
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
