# Status

Updated: 2026-09-12

| Milestone | State | Implemented | Gate |
|---|---|---|---|
| M0 Reality check | IN_PROGRESS | Pinned Bun workspace; strict config; Arc chain 5042002 and USDC 6/native 18 metadata observed; Graph/Circle probes; markets default disabled | Balance scale/receipt, Graph/Circle/Privy credentials and market choice blocked |
| M1 Financial skeleton | IN_PROGRESS | Funding intent/receipt primitives, DB constraints, custody UI | Real Privy funding and Circle return transfer NOT_RUN |
| M2 Data and policy | IN_PROGRESS | Strict strategy/money/canonical contracts, Graph normalization/provenance, pure policy engine | Live Graph deployment/pool and signed approval persistence incomplete |
| M3 Agentic loop | IN_PROGRESS | Provider-agnostic compiler, execution states, reservations schema, job leases and wallet lock | External submission intentionally gated; race/restart DB tests remain |
| M4 Product completion | IN_PROGRESS | Responsive setup/wallet/activity states, custody/network disclosure, non-LLM controls | Browser suite and human usability review pending |
| M5 Submission | IN_PROGRESS | README, architecture, sponsor/docs templates, CI, NOT_RUN manifest | Live evidence, deployment, video, presentation deck, human review missing |
| M6 Mainnet | NOT_STARTED | Mainnet config disabled | Separate September 30 readiness and human approval required |

## Verified offline commands

See `docs/TEST_REPORT.md`. Unit tests use no network or provider credentials. Live status is not inferred from fixtures.

## Deferred

Rebalancing, second market, per-trade review, charts, public mainnet deposits, and rich conversational activity explanation are deferred until the P0 live vertical slice passes.
