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

if ! /usr/sbin/runuser -u postgres -- /usr/bin/psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='sticky'" | grep -qx 1; then
  /usr/sbin/runuser -u postgres -- /usr/bin/createuser --login sticky
fi
if ! /usr/sbin/runuser -u postgres -- /usr/bin/psql -tAc "SELECT 1 FROM pg_database WHERE datname='arclet'" | grep -qx 1; then
  /usr/sbin/runuser -u postgres -- /usr/bin/createdb --owner=sticky arclet
fi

if grep -q '^DATABASE_URL=postgresql:///' "$ROOT/.env.production"; then
  ARCLET_DB_PASSWORD=$(openssl rand -hex 32)
  printf "ALTER ROLE sticky PASSWORD '%s';\n" "$ARCLET_DB_PASSWORD" | \
    /usr/sbin/runuser -u postgres -- /usr/bin/psql --quiet --set ON_ERROR_STOP=1
  export ARCLET_DATABASE_URL="postgresql://sticky:$ARCLET_DB_PASSWORD@127.0.0.1:5432/arclet"
  perl -i -pe 'if (/^DATABASE_URL=/) { $_ = "DATABASE_URL=$ENV{ARCLET_DATABASE_URL}\n" }' "$ROOT/.env.production"
  chown sticky:sticky "$ROOT/.env.production"
  chmod 600 "$ROOT/.env.production"
  unset ARCLET_DB_PASSWORD ARCLET_DATABASE_URL
fi

ARCLET_DATABASE_URL=$(sed -n 's/^DATABASE_URL=//p' "$ROOT/.env.production" | tail -n 1)
if [[ $ARCLET_DATABASE_URL != postgresql://* ]]; then
  echo "DATABASE_URL is missing or invalid in $ROOT/.env.production." >&2
  exit 1
fi

/usr/sbin/runuser -u sticky -- env \
  PATH=/home/sticky/.bun/bin:/usr/local/bin:/usr/bin:/bin \
  BUN_TMPDIR=/tmp \
  DATABASE_URL="$ARCLET_DATABASE_URL" \
  /home/sticky/.bun/bin/bun run --cwd "$ROOT" db:migrate

/usr/sbin/runuser -u sticky -- /usr/bin/psql "$ARCLET_DATABASE_URL" -Atqc \
  "SELECT count(*) FROM drizzle.__drizzle_migrations" | grep -Eq '^[1-9][0-9]*$'

install -o root -g root -m 0644 "$ROOT/ops/arclet-web.service" /etc/systemd/system/arclet-web.service
install -o root -g root -m 0644 "$ROOT/ops/arclet-worker.service" /etc/systemd/system/arclet-worker.service
systemctl daemon-reload
systemctl enable arclet-web.service
systemctl restart arclet-web.service
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:3100/api/health; then
    echo
    break
  fi
  if [[ $attempt -eq 30 ]]; then
    echo "Arclet did not become healthy on 127.0.0.1:3100." >&2
    exit 1
  fi
  sleep 1
done

install -d -m 0755 /etc/nginx/sites-disabled
for site in /etc/nginx/sites-enabled/e-files /etc/nginx/sites-enabled/stickystein /etc/nginx/sites-enabled/e-files.disabled /etc/nginx/sites-enabled/stickystein.disabled; do
  if [[ -L "$site" ]]; then
    mv --backup=numbered "$site" /etc/nginx/sites-disabled/
  fi
done

/usr/sbin/nginx -t
systemctl reload nginx
systemctl disable --now e-files-web.service

echo "Arclet web is running locally on 127.0.0.1:3100."
echo "The old stickystein nginx site and service are disabled but preserved."
echo "When DNS is ready, run: sudo $ROOT/ops/configure-domain.sh DOMAIN EMAIL"
echo "The trading worker remains disabled until Circle and provider credentials are configured."
