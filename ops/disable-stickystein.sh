#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi
curl --fail --silent --show-error --max-time 10 https://arcletai.com/api/health
install -d -m 0755 /etc/nginx/sites-disabled
for site in e-files e-files.disabled stickystein stickystein.disabled; do
  if [[ -L "/etc/nginx/sites-enabled/$site" ]]; then
    mv --backup=numbered "/etc/nginx/sites-enabled/$site" /etc/nginx/sites-disabled/
  fi
done
/usr/sbin/nginx -t
systemctl reload nginx
systemctl disable --now e-files-web.service
