# Deploy Arclet on a small Netcup Ubuntu server

This deployment runs one public Caddy proxy and keeps Next.js, PostgreSQL, and the trading worker behind Docker networks. Only TCP 22, TCP 80, TCP 443, and UDP 443 need to reach the server. PostgreSQL is never published on the host.

This is an Arc Testnet deployment. Keep `TRADING_ENABLED=false` until all live probes, the market decision, and the human money-authorization gate pass.

## Recommended host

- Ubuntu 24.04 LTS
- 2 vCPU
- 2 GB RAM minimum, with 2 GB swap for image builds
- 20 GB available storage
- A domain or subdomain with an A record pointing to the server
- An AAAA record only when working IPv6 is configured

Do not run the application as `root`. Create a normal deployment user, add only that user to the Docker group, and protect SSH with keys.

## 1. Prepare Ubuntu

Install Docker Engine and the Compose plugin from Docker's official Ubuntu repository. Do not use an unpinned application package from an unrelated PPA.

Enable the firewall after confirming SSH access:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

Optional swap for a 2 GB machine:

```sh
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Configure DNS and Privy

Create a DNS A record such as `arclet.example.com` pointing to the Netcup IPv4 address. Caddy obtains and renews TLS automatically after ports 80 and 443 are reachable.

In Privy, add the exact HTTPS origin:

```text
https://arclet.example.com
```

The value must match `APP_CANONICAL_ORIGIN`. Changing the origin changes the EIP-712 authorization domain, so existing signatures must not be reused under a different origin.

## 3. Configure secrets

From the repository root:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Fill every required provider value. At minimum, replace:

- `ARCLET_DOMAIN`
- `ACME_EMAIL`
- `POSTGRES_PASSWORD` with exactly 64 lowercase hexadecimal characters. Generate it with `openssl rand -hex 32`; do not use punctuation because Compose places this value in a PostgreSQL URL.
- Privy app ID and secret
- `DEMO_USER_ALLOWLIST`
- Graph key, source RPC, deployment, and pool
- AI base URL, key, and model

Keep these values unchanged:

```dotenv
APP_ENV=arc-testnet
CIRCLE_CHAIN=ARC-TESTNET
TRADING_ENABLED=false
ALLOW_MAINNET=false
```

Never commit `.env.production`. `./ops/deploy.sh` rejects a database password that is not exactly 64 lowercase hexadecimal characters.

## 4. Prepare the Circle session directory

The worker runs as uid 1000 and receives a dedicated persistent home directory:

```sh
mkdir -p data/circle-home
sudo chown -R 1000:1000 data/circle-home
chmod 700 data/circle-home
```

Build the worker and complete Circle terms/login/OTP interactively. The login state persists on the host and is not baked into the image:

```sh
docker compose --env-file .env.production -f compose.prod.yaml build worker
docker compose --env-file .env.production -f compose.prod.yaml run --rm worker \
  sh -lc 'test "$HOME" = /home/bun && circle wallet login YOUR_EMAIL@example.com --testnet'
```

Verify that the direct CLI command and worker use the mounted home before provisioning or enabling a market:

```sh
docker compose --env-file .env.production -f compose.prod.yaml run --rm worker \
  sh -lc 'test "$HOME" = /home/bun && test -d "$HOME" && circle --version'
docker compose --env-file .env.production -f compose.prod.yaml run --rm worker \
  sh -lc 'test "$HOME" = /home/bun && circle wallet list --type agent --chain ARC-TESTNET --output json'
```

The application runner separately maps `CIRCLE_HOME` to `HOME`; these direct checks prove the interactive login and persistent worker use the same protected host mount.

Do not copy a developer's Circle home directory into the image or repository.

## 5. Deploy

```sh
./ops/deploy.sh
```

The script validates Compose configuration, builds pinned images, starts PostgreSQL, applies migrations, and starts Caddy, web, and worker services.

Inspect the deployment:

```sh
docker compose --env-file .env.production -f compose.prod.yaml ps
docker compose --env-file .env.production -f compose.prod.yaml logs --tail=100 web worker caddy
docker compose --env-file .env.production -f compose.prod.yaml run --rm worker bun run doctor
curl -fsS https://arclet.example.com/api/health
```

Run the read-only probes inside the worker image. They must remain distinguishable from live money-moving verification:

```sh
docker compose --env-file .env.production -f compose.prod.yaml run --rm worker bun run probe:arc
docker compose --env-file .env.production -f compose.prod.yaml run --rm worker bun run probe:graph
docker compose --env-file .env.production -f compose.prod.yaml run --rm worker bun run probe:circle
```

Environment variables alone do not enable a market. Record the verified deployment, pool, asset metadata, Circle quote behavior, and market hash before changing `config/markets.json`.

## 6. Updates

Deploy only a reviewed commit:

```sh
git pull --ff-only
./ops/deploy.sh
```

The database and Caddy certificates live in named volumes. The Circle session lives in `data/circle-home`.

## 7. Backups

Create an encrypted off-server PostgreSQL backup before upgrades. Install `age` on the host, set `BACKUP_AGE_RECIPIENT` to an operator-controlled public recipient (`age1...`), and transfer the resulting `.age` file to separate encrypted storage:

```sh
umask 077
export BACKUP_AGE_RECIPIENT='age1replace-with-your-recipient'
mkdir -p backups
docker compose --env-file .env.production -f compose.prod.yaml exec -T db \
  pg_dump -U arclet -d arclet -Fc | \
  age -r "$BACKUP_AGE_RECIPIENT" > backups/arclet-$(date -u +%Y%m%dT%H%M%SZ).dump.age
```

This command never writes a plaintext dump to disk. Verify the encrypted file can be restored with the corresponding private identity before relying on it. Back up `data/circle-home` only to encrypted operator-controlled storage. It contains sensitive session material. Never place it in public evidence or ordinary application backups.

## 8. Recovery and operations

- Graph unavailable: the worker records HOLD and submits nothing.
- Circle session unavailable: freeze submissions, preserve reservations, and reauthenticate interactively.
- Unknown transaction: keep the wallet frozen and reservation retained until onchain reconciliation succeeds.
- Database restore: do not restart trading until authorization and transaction state are reconciled.
- Secret compromise: set `TRADING_ENABLED=false`, restart the worker, rotate credentials, and review provider/onchain history.

Useful commands:

```sh
# Disable new submissions after editing .env.production
docker compose --env-file .env.production -f compose.prod.yaml up -d --force-recreate worker

# Follow worker logs without exposing the database
docker compose --env-file .env.production -f compose.prod.yaml logs -f --tail=100 worker

# Stop services without deleting persistent volumes
docker compose --env-file .env.production -f compose.prod.yaml down
```

Never run `docker compose down -v` during normal operations because it deletes the PostgreSQL and Caddy volumes.
