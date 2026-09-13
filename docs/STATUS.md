# Status

Updated: 2026-09-12

| Milestone | State | Implemented | Gate |
|---|---|---|---|
| M0 Reality check | IN_PROGRESS | Pinned Bun workspace; strict config; Arc chain 5042002 and USDC 6/native 18 metadata observed; Graph/Circle probes; markets default disabled | Balance scale/receipt, Graph/Circle/Privy credentials and market choice blocked |
| M1 Financial skeleton | IN_PROGRESS | Tenant-scoped wallet claim, transaction-sender-bound funding confirmation, fixed-destination withdrawal authorization with one nonterminal withdrawal per wallet, custody UI | Real Privy funding and Circle return transfer NOT_RUN |
| M2 Data and policy | IN_PROGRESS | Strict strategy/money/canonical contracts, Graph normalization/provenance with decision-time freshness recomputation, immutable draft versions, nonce-bound EIP-712 approval, pure policy engine | Live Graph deployment/pool/factory verification and PostgreSQL transaction tests remain blocked |
| M3 Agentic loop | IN_PROGRESS | Recurring slot-deduplicated evaluations, reservation/idempotency state, lock/fence recheck before submit, wallet lock, UNKNOWN freeze/reconciliation, refreshed withdrawal balance guards | External submission remains gated because no market or provider session is verified; race/restart PostgreSQL tests remain blocked |
| M4 Product completion | IN_PROGRESS | Minimal black-and-white newspaper interface with Arclet title, one explanatory paragraph, one authenticated mandate chat, contextual decision/trade records, and a persisted-USDC history chart | Live records, authenticated provider browser coverage, and human usability review pending |
| M5 Submission | IN_PROGRESS | README, architecture, sponsor/docs templates, CI, NOT_RUN manifest | Live evidence, deployment, video, presentation deck, human review missing |
| M6 Mainnet | NOT_STARTED | Mainnet config disabled | Separate September 30 readiness and human approval required |

## Verified offline commands

See `docs/TEST_REPORT.md`. The final safety pass added recurring-schedule, decision-time Graph freshness, transaction-sender, pause/lease fence, ambiguous-provider, and withdrawal balance-buffer coverage. Unit tests use no network or provider credentials. Live status is not inferred from fixtures.

## Deferred

Rebalancing, second market, per-trade review, public mainnet deposits, and rich conversational activity explanation are deferred until the P0 live vertical slice passes. The desk chart is implemented but renders only persisted ERC-20 USDC snapshots; no asset valuation or performance chart is claimed.
