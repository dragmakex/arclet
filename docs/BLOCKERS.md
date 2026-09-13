# Blockers

These are external/live gates, not offline test failures.

1. Privy app ID/secret, configured origins, email login, embedded EVM wallet, and a real Arc user-signed USDC funding transaction are not available.
2. Graph API key and Ethereum source RPC are absent. Candidate deployment schema, source chain, pool token/factory identity, freshness, and current observation are unverified.
3. Circle CLI is not installed/configured at an absolute path; terms/login/OTP, Agent Wallet inventory, quota, response schemas, quotes, session storage, and swap/transfer behavior are unverified.
4. No human has approved a market/custody disclosure or a tiny testnet spend.
5. PostgreSQL was not available during recovery. The checked-in migration was generated but not applied; advisory-lock races, nonce consumption, receipt deduplication, and tenant-scoped durable API flows require a real local PostgreSQL integration run.
6. No hosted web/worker/database deployment, public repository URL, video, or live transaction evidence exists. The Netcup production Compose configuration validates, but its images were not built locally because the Docker daemon was unavailable; verify the pinned Circle CLI image on the Ubuntu host before deployment.
7. Arc mainnet capabilities and identifiers remain intentionally unknown and disabled.
