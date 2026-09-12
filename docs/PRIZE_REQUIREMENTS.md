# Sponsor requirements and current proof

## Circle / Arc

Load-bearing files: `packages/circle`, `apps/worker`, `packages/policy`, and `packages/chain`. The adapter is implemented but actual Agent Wallet identity, quotes, command fixtures, submissions, Arc receipts, and September 30 mainnet follow-through are NOT_RUN.

## The Graph

Load-bearing files: `packages/graph`, query documents, and policy observation guards. Strict failure and token-orientation tests pass offline. Authenticated deployment/source/pool/freshness proof and a decision changed by live Graph data are NOT_RUN.

## Privy

Load-bearing files: `apps/web/app/providers.tsx`, `apps/web/lib/auth.ts`, funding intent API, and chain receipt verifier. Login and embedded-wallet UI boundaries exist. A real user-signed funding transaction and return transfer are NOT_RUN.
