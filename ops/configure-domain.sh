#!/usr/bin/env bash
set -euo pipefail

ROOT=/home/sticky/git/arclet
DOMAIN=${1:-}
EMAIL=${2:-}

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script with sudo: sudo $ROOT/ops/configure-domain.sh DOMAIN EMAIL" >&2
  exit 1
fi
if [[ ! $DOMAIN =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]]; then
  echo "Provide a valid lowercase domain name." >&2
  exit 1
fi
if [[ ! $EMAIL =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "Provide a valid ACME contact email." >&2
  exit 1
fi

sed "s/__ARCLET_DOMAIN__/$DOMAIN/g" "$ROOT/ops/nginx-arclet.conf.example" > /etc/nginx/sites-available/arclet
ln -sfn /etc/nginx/sites-available/arclet /etc/nginx/sites-enabled/arclet
/usr/sbin/nginx -t
systemctl reload nginx

certbot --nginx --non-interactive --agree-tos --redirect --email "$EMAIL" -d "$DOMAIN"

sed -i "s#^APP_CANONICAL_ORIGIN=.*#APP_CANONICAL_ORIGIN=https://$DOMAIN#" "$ROOT/.env.production"
systemctl restart arclet-web.service
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 --connect-timeout 5 --max-time 10 "https://$DOMAIN/api/health"
echo
echo "Arclet is available at https://$DOMAIN"
