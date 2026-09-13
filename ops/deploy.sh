#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

if [ ! -f .env.production ]; then
  echo "Missing .env.production. Copy .env.production.example and fill every required value." >&2
  exit 1
fi

POSTGRES_PASSWORD=$(sed -n 's/^POSTGRES_PASSWORD=//p' .env.production | tail -n 1)
case "$POSTGRES_PASSWORD" in
  *[!0-9a-f]*)
    echo "POSTGRES_PASSWORD must be 64 lowercase hexadecimal characters. Generate it with: openssl rand -hex 32" >&2
    exit 1
    ;;
esac
if [ "${#POSTGRES_PASSWORD}" -ne 64 ]; then
  echo "POSTGRES_PASSWORD must be 64 lowercase hexadecimal characters. Generate it with: openssl rand -hex 32" >&2
  exit 1
fi

mkdir -p data/circle-home
chmod 700 data/circle-home

CIRCLE_OWNER=$(stat -c '%u' data/circle-home)
if [ "$CIRCLE_OWNER" != "1000" ]; then
  echo "data/circle-home must be owned by uid 1000 for the non-root worker." >&2
  echo "Run: sudo chown -R 1000:1000 data/circle-home" >&2
  exit 1
fi

COMPOSE="docker compose --env-file .env.production -f compose.prod.yaml"
$COMPOSE config --quiet
$COMPOSE build --pull
$COMPOSE up -d db
$COMPOSE run --rm worker bun run db:migrate
$COMPOSE up -d
$COMPOSE ps

echo "Deployment started. Verify with:"
echo "$COMPOSE logs --tail=100 web worker caddy"
echo "$COMPOSE run --rm worker bun run doctor"
