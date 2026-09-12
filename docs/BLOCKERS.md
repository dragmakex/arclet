# Blockers

These are external/live gates, not offline test failures.

1. Privy app ID/secret, configured origins, email login, embedded EVM wallet, and a real Arc user-signed USDC funding transaction are not available.
2. Graph API key and Ethereum source RPC are absent. Candidate deployment schema, source chain, pool identity, freshness, and current observation are unverified.
3. Circle CLI is not installed/configured at an absolute path; terms/login/OTP, Agent Wallet inventory, quota, response schemas, quotes, session storage, and swap/transfer behavior are unverified.
4. No human has approved a market/custody disclosure or a tiny testnet spend.
5. PostgreSQL was not started during initial implementation, so migrations, advisory-lock races, and durable API flows have not been exercised.
6. No hosted web/worker/database deployment, public repository URL, video, or live transaction evidence exists.
7. Arc mainnet capabilities and identifiers remain intentionally unknown and disabled.
