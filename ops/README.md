# Native host deployment

Arclet runs as a systemd service on `127.0.0.1:3100`; the machine's existing nginx terminates TLS. PostgreSQL stays on its local socket. The trading worker is installed but intentionally left disabled until Circle login and the other provider gates are complete.

From the repository root:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
# Fill provider values if available. Keep TRADING_ENABLED=false.
PATH=/home/sticky/.bun/bin:$PATH bun install --frozen-lockfile
PATH=/home/sticky/.bun/bin:$PATH bun run build
sudo ./ops/install-host.sh
```

`install-host.sh` starts Arclet, migrates its database, disables the old `e-files-web` service, and moves the enabled stickystein nginx symlink to `e-files.disabled`. It does not delete the old service, application, nginx source file, or certificate.

After the new domain's A/AAAA records point to this host:

```sh
sudo ./ops/configure-domain.sh arclet.example.com operator@example.com
```

Add the same HTTPS origin in Privy. Because `NEXT_PUBLIC_PRIVY_APP_ID` is embedded at build time, rebuild and restart after adding it:

```sh
PATH=/home/sticky/.bun/bin:$PATH bun run build
sudo systemctl restart arclet-web
```

Do not enable `arclet-worker.service` until Circle terms/login/OTP, live provider probes, the market decision, and the human testnet-spend authorization are complete.

Rollback is preserved as an explicit operation:

```sh
sudo ./ops/restore-stickystein.sh
```
