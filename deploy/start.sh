#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
APPS_COMPOSE_FILE="$SCRIPT_DIR/../apps/docker-compose.yml"

docker compose -f "$COMPOSE_FILE" down --remove-orphans || true

if [ -f "$APPS_COMPOSE_FILE" ]; then
	docker compose -f "$APPS_COMPOSE_FILE" down --remove-orphans || true
fi

docker compose -f "$COMPOSE_FILE" up --build -d
