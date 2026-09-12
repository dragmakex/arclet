# Decisions

## 2026-09-12: Keep both markets disabled

No authenticated Graph deployment/pool probe or Circle two-direction quote has run. `usdc-cirbtc` and `usdc-eurc` remain `UNVERIFIED`; Arclet does not silently choose a market.

## 2026-09-12: Application custody is explicit

The Privy embedded wallet remains user-controlled. Each funded user must receive a distinct application-operated Circle Agent Wallet. The UI and docs avoid non-custodial or trustless claims.

## 2026-09-12: External mutations remain gated

The worker persists/leases work but does not submit provider mutations. Circle response schemas, wallet inventory, quote/minimum-output behavior, transfer reconciliation, and human amount approval must be verified first.

## 2026-09-12: Bun workspace without an imported upstream

The repository was empty except for its three planning files and had no inherited lockfile. Bun 1.3.0 is used and exact resolved versions are recorded in `config/dependency-versions.json`.
