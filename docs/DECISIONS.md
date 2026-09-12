# Decisions

## 2026-09-12: Keep both markets disabled

No authenticated Graph deployment/pool probe or Circle two-direction quote has run. `usdc-cirbtc` and `usdc-eurc` remain `UNVERIFIED`; Arclet does not silently choose a market.

## 2026-09-12: Application custody is explicit

The Privy embedded wallet remains user-controlled. Each funded user must receive a distinct application-operated Circle Agent Wallet. The UI and docs avoid non-custodial or trustless claims.

## 2026-09-12: External mutations remain gated

The worker persists/leases work but does not submit provider mutations. Circle response schemas, wallet inventory, quote/minimum-output behavior, transfer reconciliation, and human amount approval must be verified first.

## 2026-09-12: One live challenge per authorization purpose

Mandate and withdrawal challenge issuance revokes older unconsumed challenges for the same strategy or trading wallet. Activation locks the trading-wallet row and rejects a second active strategy. This makes the application-level one-active-mandate rule and nonce consumption explicit without claiming onchain enforcement.

## 2026-09-12: Retain funds for every ambiguous provider result

A Circle-reported failure is not treated as proof that a submitted swap did not move funds. Reconciliation marks the execution `UNKNOWN`, retains the reservation, freezes the wallet, and keeps polling until an onchain receipt or other verified recovery evidence is available. Withdrawal provider failures likewise require operator attention rather than a blind retry.

## 2026-09-12: Decision-time freshness and recurring evaluations

The worker advances each active mandate to a unique next evaluation slot, never catches up missed DCA windows, and recomputes Graph source-block/swap age at every decision. A source RPC chain ID and pool token pair are checked before persisting an enabled-market observation. Pool factory verification remains an M0 live gate because no verified factory address has been recorded.

## 2026-09-12: Bun workspace without an imported upstream

The repository was empty except for its three planning files and had no inherited lockfile. Bun 1.3.0 is used and exact resolved versions are recorded in `config/dependency-versions.json`.
