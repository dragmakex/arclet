#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script with sudo: sudo /home/sticky/git/arclet/ops/restore-stickystein.sh" >&2
  exit 1
fi

install -d -m 0755 /etc/nginx/sites-disabled
if [[ -L /etc/nginx/sites-enabled/arclet ]]; then
  mv --backup=numbered /etc/nginx/sites-enabled/arclet /etc/nginx/sites-disabled/
fi
for site in e-files stickystein; do
  for backup in "/etc/nginx/sites-disabled/$site" "/etc/nginx/sites-disabled/$site.disabled"; do
    if [[ -L "$backup" && ! -e "/etc/nginx/sites-enabled/$site" ]]; then
      mv "$backup" "/etc/nginx/sites-enabled/$site"
    fi
  done
  if [[ -L "/etc/nginx/sites-enabled/$site.disabled" ]]; then
    mv "/etc/nginx/sites-enabled/$site.disabled" "/etc/nginx/sites-enabled/$site"
  fi
done

/usr/sbin/nginx -t
systemctl reload nginx
systemctl enable --now e-files-web.service
systemctl disable --now arclet-web.service
echo "The preserved stickystein service and nginx site are active again."
