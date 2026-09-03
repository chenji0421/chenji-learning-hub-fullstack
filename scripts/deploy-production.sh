#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.server.example to .env and fill production secrets first." >&2
  exit 1
fi

docker compose --env-file .env -f docker-compose.server.yml config --quiet
docker compose --env-file .env -f docker-compose.server.yml up -d --build
docker compose --env-file .env -f docker-compose.server.yml ps
