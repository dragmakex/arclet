#!/usr/bin/env bash
set -euo pipefail

ROOT=/home/sticky/git/arclet

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script with sudo: sudo $ROOT/ops/install-host.sh" >&2
  exit 1
fi

test -f "$ROOT/.env.production"
test -f "$ROOT/apps/web/.next/BUILD_ID"
test -x /home/sticky/.bun/bin/bun

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='sticky'" | grep -qx 1; then
  runuser -u postgres -- createuser --login sticky
fi
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='arclet'" | grep -qx 1; then
  runuser -u postgres -- createdb --owner=sticky arclet
fi

runuser -u sticky -- env \
  PATH=/home/sticky/.bun/bin:/usr/local/bin:/usr/bin:/bin \
  BUN_TMPDIR=/tmp \
  DATABASE_URL='postgresql:///arclet?host=/var/run/postgresql' \
  /home/sticky/.bun/bin/bun --cwd "$ROOT" run db:migrate

install -o root -g root -m 0644 "$ROOT/ops/arclet-web.service" /etc/systemd/system/arclet-web.service
install -o root -g root -m 0644 "$ROOT/ops/arclet-worker.service" /etc/systemd/system/arclet-worker.service
systemctl daemon-reload
systemctl enable --now arclet-web.service
curl --fail --silent --show-error http://127.0.0.1:3100/api/health
echo

for site in /etc/nginx/sites-enabled/e-files /etc/nginx/sites-enabled/stickystein; do
  if [[ -L "$site" ]]; then
    mv "$site" "$site.disabled"
  fi
done

/usr/sbin/nginx -t
systemctl reload nginx
systemctl disable --now e-files-web.service

echo "Arclet web is running locally on 127.0.0.1:3100."
echo "The old stickystein nginx site and service are disabled but preserved."
echo "When DNS is ready, run: sudo $ROOT/ops/configure-domain.sh DOMAIN EMAIL"
echo "The trading worker remains disabled until Circle and provider credentials are configured."
