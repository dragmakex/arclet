# Arclet - Product and Engineering Specification

Version: 1.0  
Prepared: 2026-09-12  
Target: ETHOnline 2026, Start Fresh  
Status: Build specification, not an implemented or independently tested application

## 0. Read this first

Build a conversational, agentic wallet. A user signs in, funds a small trading balance, describes a strategy, reviews the exact rules, and authorizes an agent to execute those rules against live blockchain signals. Every trade must have an inspectable explanation, source evidence, policy evaluation, and onchain receipt.

This is a financial application, not a game. Do not add characters, leaderboards, speculative return promises, arbitrary risk scores, or a generic chatbot in place of working execution.

Read `AGENT.md` after this file. `PROMPT.md` is the short bootstrap prompt. All three files belong in the repository root and must remain in the public submission. This document is the product/architecture authority; `AGENT.md` specifies the implementation process. Bracketed references such as [R1] resolve in section 26.

### 0.1 Time-critical event facts

The official submission page currently specifies **September 13, 2026 at 12:00 EDT**, equivalent to **16:00 UTC / 18:00 Europe/Zurich**. The event ending on September 16 is NOT the submission deadline. Recheck the Hacker Dashboard before submission. [R1]

ETHGlobal permits spec-driven development but requires publication of the specifications/prompts and disclosure of AI assistance. It also requires meaningful human contributions; entirely AI-created submissions may be ineligible. The agent must assist a human team, not fabricate human authorship or claim that an unattended build guarantees eligibility. Keep a real contribution and review log. [R1]

### 0.2 Corrections to the earlier product discussion

1. **Do not assume ETH trading is available on Arc.** The documented Arc Testnet Swap product supports USDC, EURC, and cirBTC. ETH execution is disabled until a real supported route, token address, and successful smoke trade are verified. [R6]
2. **Do not equate Privy authentication with Circle authorization.** They are separate wallet systems. The design below explicitly separates a user's Privy wallet from an app-operated Circle trading wallet.
3. **Do not claim Circle's spending policies protect testnet funds.** The documented Agent Wallet policy feature is mainnet-only. MVP policy enforcement is in the application, not an immutable onchain guard. [R8]
4. **Do not assume an Arc Subgraph already exists for a chosen market.** The initial Graph signal source can index Ethereum mainnet while execution happens on Arc Testnet. Show both networks prominently. This is cross-network observation, not a bridge or a cross-chain trade.
5. **Do not represent a testnet transaction as investment performance.** Testnet tokens have no financial value; testnet cirBTC is not backed by real BTC. [R7]
6. **Do not treat a specification as verified integration code.** The research here verified documentation, not authenticated SDK calls, live swaps, Privy transactions, or the team's eligibility. Phase 0 resolves these runtime dependencies before a polished UI is built.

### 0.3 What must be delivered

A public source repository; working frontend, API, and persistent worker; real Privy wallet funding; a real Circle Agent Stack swap on Arc; live Graph data that changes a decision; strategy approval, pause, and withdrawal; automated tests; runbooks; an architecture diagram; a 2-4 minute human-narrated demo; a short presentation; sponsor-specific evidence; and a truthful mainnet deployment plan.

A clean local test suite is necessary but insufficient. The live integration gates in section 22 must also pass. No deadline pressure permits replacing a required live integration with a mock and marking it complete.

## 1. Product definition

**Name:** Arclet  
**One-line pitch:** Tell your wallet the rules. It watches live onchain data and trades within the mandate you approved.

**Primary user:** Someone who already understands that digital assets carry risk but does not want to manually operate a DEX or monitor a strategy continuously.

**Core interaction:**

> Buy 1 USDC of cirBTC every day, but only while the reference market has at least 1 million dollars of pool TVL. Keep 2 USDC untouched and never trade more than 5 USDC of principal per day.

The application translates this into a typed, reviewable mandate. It does not convert vague language into undisclosed risk preferences. Once authorized, a backend worker evaluates live Graph data, checks balances and limits, obtains a Circle quote, and executes through Circle Agent Stack. The user can subsequently ask what happened, revise the mandate, pause it, or withdraw.

The differentiation is **inspectable, persistent mandates**, not claims of superior trading intelligence. The language model interprets and explains. A deterministic execution engine makes the authorized conditions enforceable within the application's trust boundary.

### 1.1 Initial supported markets

| Market | Execution asset pair | Signal source | Delivery priority |
|---|---|---|---|
| BTC accumulation | Arc Testnet USDC/cirBTC | Live Ethereum WBTC/USDC pool data through The Graph, explicitly a proxy | P0 when quote and live data probes pass |
| Stablecoin FX | Arc Testnet USDC/EURC | Live Ethereum EURC/USDC pool data through The Graph, explicitly cross-network | P0 alternative if it is the first fully verified pair; P1 as a second market |
| ETH strategies | None enabled initially | Read-only research may be added later | Out of submission scope unless fully verified |

Start by probing BOTH supported execution pairs. Implement the first pair with a passing buy/sell quote and a fresh, meaningful Graph source; prefer cirBTC for the intended crypto trading experience. Never silently substitute EURC for BTC or ETH in a user's request. Display the available market and ask the user to select it in the product UI.

Do not turn WBTC into cirBTC in accounting. They are different token contracts and representations. A WBTC/USDC signal can inform a cirBTC strategy only with an explicit, approved `PROXY` mapping. Graph reference prices are not Arc execution quotes. Wrapped-asset basis risk is disclosed, and testnet price divergence is not hidden.

### 1.2 Scope tiers

**P0 - submission-critical:** One verified market; Privy email login and embedded EVM wallet; a distinct Circle Agent Wallet for each funded demo user; real USDC funding and return transfer; conditional-price strategy and scheduled fixed-amount buying; signed mandate approval; live Graph evidence; autonomous worker; quote/minimum-output guard; pause; inspectable activity; secure API; tests and submission materials.

**P1 - after P0 is proven:** Two-sided portfolio rebalancing; a second market; richer charts; per-trade review mode; signed mandate edits; improved source discovery UI. The data model must accommodate these without forcing them into the first vertical slice.

**P2 - post-hackathon:** User-owned Circle authorization/session onboarding, audited onchain constraints or equivalently validated provider controls, public mainnet use, additional verified assets, notifications, and advanced market data.

**Explicitly excluded:** Leverage, shorts, perpetuals, lending, yield vaults, a new token, a new AMM, bridging, WhatsApp integration, social copy trading, permissionless user-defined execution targets, unlimited approvals, simulated APY, and opaque predictive trading scores.

No custom smart contract is required for this MVP. Use actual Circle-supported swaps instead of inventing an execution venue. A frontend-only app, local-only market simulator, or Privy-login-only integration does not meet this specification.

## 2. Prize strategy and evidence contract

Target exactly these three partners and name the specific bounty in the submission. Prize eligibility and awards remain decisions of the organizers/sponsors.

| Target | Amount and conditions | Load-bearing implementation | Required evidence |
|---|---|---|---|
| Circle/Arc: Best Agentic Economy Application with Circle Agent Stack | $3,500 total; $2,500 is conditional on the same project being deployed to Arc Mainnet by September 30 [R2] | Circle Agent Wallet and CLI execute an authorized, Graph-triggered USDC swap on Arc; frontend and persistent backend both work | Agent wallet identity; exact integration files; sanitized command/result; Arc receipts; architecture; public repo; video; presentation; mainnet follow-through |
| The Graph: Best AI Tooling or AI Use Case with The Graph (From Scratch) | $5,000 pool, allocated $2,500 / $1,500 / $1,000 [R3] | AI compiles a strategy using available Graph-derived metrics; live Graph observations determine EXECUTE versus HOLD | Authenticated live response; deployment/pool/source block; derived metrics; decision trace; negative case when data is unavailable; public repo and 2-4 minute video |
| Privy: Best financial flow | $2,500 [R4] | Embedded wallet creation and user-signed USDC funding transaction, followed by funds returning to the same personal wallet | New or existing Privy embedded wallet; real transfer receipt; balance change; source code; UX explanation |

The Graph route is an **AI application**, not a tooling submission. Do not claim the separate Substreams one-prompt challenge. Direct GraphQL queries using a Studio API key are sufficient if the data is live and materially used. MCP and x402 are optional, not required checkboxes.

Nanopayments, App Kits, and Paymaster are optional in the Circle bounty where relevant. Agent Wallet + Agent Stack execution is the primary integration. Do not add paid API calls just to accumulate logos. The Graph's documented x402 settlement networks are Base and Base Sepolia; do not describe an x402 Graph payment as an Arc transaction. [R16]

**Pass/fail submission proof:** A user funds with Privy, signs a mandate, the worker reads live Graph data, a real condition passes, Circle executes on Arc without another trade click, and the activity view links the resulting receipt. A second evaluation must visibly HOLD when a required condition or data-health check fails.

## 3. Architecture and trust boundaries

### 3.1 Chosen stack

- TypeScript with strict checking. Use **Bun** as the default JavaScript/TypeScript runtime and package manager, with a committed `bun.lock`. Before installing dependencies, inspect the repository: if imported/upstream GitHub code already contains `pnpm-lock.yaml` or `pnpm-workspace.yaml`, preserve pnpm for that inherited workspace instead of converting it. Otherwise use Bun for installs, scripts, tests, and workspace management. Do not introduce npm or yarn unless a third-party tool explicitly requires it.
- Next.js App Router and React for the web app and HTTP API. Tailwind CSS and accessible headless components for UI. Avoid bringing in a second frontend framework.
- A separate long-running Bun worker for strategy polling, submission, and reconciliation. No browser timers or serverless background promises for trading.
- PostgreSQL for users, strategies, immutable approvals, jobs, execution state, and evidence. Use Drizzle ORM plus explicit SQL transactions/advisory locks where needed. No Redis required for P0.
- Privy React SDK for email login, embedded wallet, signatures, and funding. Use the current compatible Privy server SDK for token verification.
- Circle Agent Stack through a pinned `@circle-fin/cli` installation and a narrow server-only process adapter. Do not import a local private key and call it an Agent Wallet.
- `viem` for chain definitions, ABI encoding, read-only RPC, receipt validation, and signature verification; `decimal.js` for high-precision financial calculations; Zod for boundary validation.
- AI SDK with a provider-agnostic model adapter and strict Zod-validated structured outputs. Prefer `ai` plus an OpenAI-compatible provider adapter so inexpensive models such as Qwen3-class models can be used through whichever compatible inference provider the team selects. Configure `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`; never hard-code a provider-specific model ID or require an expensive frontier model. The compiler/explainer must work with any model that reliably satisfies the schema; provider changes must not alter the strategy or policy engine. [R22]
- Vitest for unit/integration tests; Playwright for browser testing; Docker Compose for web/worker/Postgres. Pin actual compatible versions during Phase 0, record them, and never use `latest` in a committed deployment.
- Do not add Python unless a concrete integration or data task requires it. If Python is needed, use **uv** for Python version/dependency/environment management (`uv run`, `uv sync`, `pyproject.toml`, `uv.lock`); do not use ad-hoc `pip`, Poetry, or Conda for project tooling.

### 3.2 LLM portability and cost requirements

Arclet must not depend on a premium proprietary model. The default development target is a **cheap Qwen3-class instruction/reasoning model** exposed through an OpenAI-compatible API, but the exact provider and model ID are environment configuration because availability and naming differ by inference vendor.

Required model interface:

- `AI_PROVIDER=openai-compatible` by default.
- `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` are server-only environment variables.
- `packages/agent/src/model-provider.ts` is the only provider-construction boundary. No product/business module imports a vendor SDK directly.
- Compiler output is validated against Zod schemas. Invalid/malformed output is rejected or retried within a small bounded retry count; it never reaches execution unchecked.
- The execution/policy engine remains deterministic and model-independent. A cheaper or different model may change wording/interpretation quality but cannot bypass approved policy guards.
- Maintain a deterministic fallback UI for pause, withdrawal, balances, and stored explanations when the model is unavailable.
- Keep prompts compact and token budgets bounded so a low-cost model is viable. Do not require long chain-of-thought output; request concise structured results and short grounded explanations.

A Qwen3-class model is the preferred low-cost demo choice if it passes the strategy-compiler contract tests. If it fails schema reliability, use another inexpensive compatible model and record the measured reason in `docs/DECISIONS.md`; do not silently switch to an expensive model.

### 3.3 System diagram

```mermaid
flowchart LR
    U[User] --> W[Next.js web app]
    W --> P[Privy login and personal embedded wallet]
    P -->|User-signed USDC funding on Arc| C[Dedicated Circle Agent Wallet]
    W -->|Authenticated API and signed mandate| A[Next.js API]
    A --> DB[(PostgreSQL)]
    DB --> J[Persistent strategy worker]
    G[The Graph gateway: live source-chain pools] --> D[Validated market snapshot]
    D --> J
    L[LLM: compile and explain only] <--> A
    J --> R[Deterministic policy and balance checks]
    R --> Q[Circle quote and minimum-output validation]
    Q --> X[Restricted Circle CLI executor]
    X --> C
    C --> S[Supported swap settlement on Arc]
    S --> V[RPC receipt and balance reconciliation]
    V --> DB
    DB --> E[Activity and evidence drawer]
    E --> W
    C -->|Approved withdrawal| P
```

Create `docs/architecture.mmd` from the final architecture and render `docs/architecture.svg` using a pinned Mermaid renderer. Include the rendered diagram in the README and presentation. Text claims in the diagram must match what is actually running.

### 3.3 Wallet ownership: do not hide this

**Personal wallet:** Created/used through Privy and controlled by the user. The application never exports its key. The backend verifies the authenticated user and the linked embedded wallet before preparing funding or accepting an approval.

**Trading wallet:** A separate Circle Agent Wallet operated by the application's executor. For the hackathon, the operator authenticates their Circle account outside the application, pre-provisions distinct wallets, and assigns one wallet to one invited user. Funds sent there are under the application's automation authority. They are NOT protected by the Privy wallet's self-custody once transferred.

The operator's Circle login may itself be a user-controlled Circle wallet account, but that does not make the application's end user its controller. State this distinction in `docs/SECURITY.md` and at funding time.

**Consequences:**

- Never call the complete product non-custodial, trustless, or contract-enforced.
- Keep demo amounts small and restrict funded demos to approved users.
- Never pool different users' assets in one Circle wallet.
- The documented Circle account has a wallet quota; current CLI documentation describes a maximum of five Agent Wallets. Discover the actual inventory and quota before allocation. Return a clear capacity error rather than reusing another user's wallet. [R9]
- Initially run public demo access as read-only unless an invite is approved. A shared prerecorded/read-only example must not expose someone else's full private data.
- For a mainnet follow-through, default to a single operator-owned account with tiny operator-owned funds. Public customer funding remains disabled until custody, authorization, compliance, and security reviews are complete.

An offchain signed mandate proves what the user approved to this application. It does not prevent a compromised executor or operator from using the Circle session outside the policy engine. This limitation must remain visible; do not bury it in a tooltip.

## 4. Network, asset, and runtime configuration

### 4.1 Verified testnet constants

These are documented values as of the preparation date, not a substitute for startup probes. [R5, R7, R10]

```text
Arc Testnet chain ID: 5042002
Circle chain identifier: ARC-TESTNET
RPC: https://rpc.testnet.arc.io
Explorer: https://testnet.arcscan.app
Native gas asset: USDC, 18 decimals
USDC ERC-20 interface: 0x3600000000000000000000000000000000000000
USDC ERC-20 decimals: 6
EURC: 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
EURC decimals: 6
cirBTC: 0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF
cirBTC decimals: discover with decimals(); do not infer from WBTC
```

Use `arcTestnet` from `viem/chains` if the pinned version includes it and its fields match the official configuration. Otherwise define exactly the verified custom EVM chain. [R5, R19]

The Arc documentation currently announces public mainnet for September 16, 2026. Its testnet address page does not provide production addresses. Mainnet configuration must be separately discovered and verified; never copy testnet values into production or guess a Circle chain identifier. [R10, R21]

### 4.2 Arc USDC accounting invariant

Arc native USDC and ERC-20 USDC are two views of ONE balance. Native uses 18 decimals; ERC-20 uses 6. [R11]

```text
erc20ViewAtomic6 = floor(nativeBalanceAtomic18 / 10^12)
nativeEquivalentAtomic18 = erc20AmountAtomic6 * 10^12
```

Keep native dust in the internal balance snapshot; round only in the display. Do not add both balances to the portfolio. Use ERC-20 `transfer` for the Privy funding flow and identify the ERC-20 emitter when parsing its logs. A single economic movement can emit native-system and ERC-20 logs; never credit both. Record gas separately from asset transfers. [R11]

For an ERC-20 transfer of 1 USDC, calldata amount is `1000000`, transaction `value` is zero. For a native transfer of 1 USDC, value is `1000000000000000000`. The application must not confuse these. Some documentation examples can be inconsistent with prose; the dual-interface model and live read-only checks are authoritative for this implementation.

For Privy-originated EIP-1559 transactions, obtain current gas estimates and validate against Arc's documented minimum fee parameters instead of reusing Ethereum fee defaults. A transaction whose fee ceiling is below the network minimum can remain pending. Preserve gas buffers in both wallets and reconcile actual gas in native atomic18 units. Do not hardcode testnet fee parameters into mainnet configuration. [R27]

### 4.3 Configuration files

- `config/chains/arc-testnet.json`: explicit chain, RPC public defaults, explorer, validated token metadata, `verifiedAt`, sources, and environment.
- `config/chains/arc-mainnet.json`: initially `enabled: false` with no invented addresses. Readiness validation rejects placeholders.
- `config/markets.json`: enabled markets, execution token IDs, approved Graph sources, mapping kind, evidence hashes, and supported strategy types.
- `config/runtime.ts`: validated environment and runtime safety limits, separate from user mandates.
- `config/dependency-versions.json`: installed versions, CLI version, upstream starter commit if reused, and verification date.

A market configuration change changes the signed `marketConfigHash` and suspends affected strategies until users approve the changed semantics. Do not silently switch pools, proxy assets, chains, or execution tokens under an existing mandate.

## 5. Product UX and required screens

### 5.1 Onboarding and funding

Email sign-in -> create/select the correct Privy embedded EVM wallet -> show Arc Testnet -> show custody and testnet disclosure -> claim or receive faucet funds -> show the distinct trading wallet address -> user signs a USDC transfer through Privy -> verify the receipt and balance -> enable strategy creation.

Do not request a fiat onramp, Privy Cards, or guided commercial onboarding to make the core flow work. A faucet supplies test assets; the qualifying Privy flow is the subsequent actual user-signed transfer.

Funding form must show amount, source, destination, network, estimated fee or an honest unavailable-fee state, and what authority changes after funding. Keep a gas buffer in the personal wallet. Do not transfer its entire USDC balance.

### 5.2 Main wallet screen

Desktop: compact balance header, chat/strategy column, active mandate card, recent activity. Mobile: stack these in that order. Required components:

- Persistent `Arc Testnet - no real monetary value` environment label.
- Separate `Personal balance` and `Trading balance`; consolidated total must not double-count transfers or native/ ERC-20 USDC views.
- `Active / Paused / Needs setup / Data stale / Execution uncertain` status.
- A prominent Pause button that does not require an LLM call.
- Chat with starter prompts, a structured strategy preview, and a distinct signing/activation action.
- Asset balances denominated in actual token units. Any reference valuation says which source/pair it uses. Do not present simulated dollar balances as real money.
- Data drawer showing source network, execution network, Subgraph, pool, block, observation time, freshness, and proxy mapping.
- Activity entries with HOLD reasons as well as trades. Empty accounts start empty, not with invented trading history.

### 5.3 Strategy preview

Show the original user instruction alongside exact interpreted values: market, action, size, trigger, interval/cooldown, reserve, trading-turnover cap, allocation cap, expiry, execution mode, and evidence source. Defaults must be marked `proposed default` and included in approval. Unsupported requests show a specific explanation, not an altered strategy.

Example rejection:

> ETH execution is not enabled on this Arc environment. You can create a cirBTC strategy or an EURC strategy, or leave this request unactivated.

Example clarification:

> "Aggressively" does not specify an amount or maximum exposure. Choose those values before activation.

### 5.4 Conversational commands

Implement at least: create a mandate; explain current rules; explain an activity entry; pause; show balances; show why a condition has not fired. `Pause` can be deterministic UI/intent routing and must work if the model is unavailable.

Edits always produce a new version for approval. Do not alter active limits from a chat message alone. Withdrawal is a dedicated form with user authentication and signature, not a free-form LLM tool.

### 5.5 Activity/evidence language

Say `Confirmed on Arc` only after a successful onchain receipt and reconciliation. A Circle API/CLI success response can mean accepted/submitted, not finalized. Distinguish `Quoted`, `Submitting`, `Pending`, `Confirmed`, `Failed`, and `Unknown; reconciling`.

Explanations cite stored facts by observation/decision ID. The model may phrase the explanation but may not invent prices, fills, rationale, or transactions. Always retain a deterministic explanation fallback.

## 6. AI and strategy design

### 6.1 Runtime AI responsibilities

The AI can:

1. Inspect the enabled market registry and supported strategy schema.
2. Read a validated live market snapshot and current portfolio through restricted read-only tools.
3. Convert user language into a proposed typed strategy or clarification.
4. Explain recorded decisions and propose an explicit versioned edit.

The AI cannot sign, access wallet sessions, choose arbitrary recipients, execute shell commands, select unapproved RPCs, create arbitrary GraphQL, change safety ceilings, or modify active rules. There is no unconstrained `trade()` or `run_shell()` tool in the user-facing model.

Keep runtime prompts in `packages/agent/src/prompts/`. Treat token names, pool metadata, Graph results, and chat content as untrusted data, not instructions. Truncate and schema-validate external fields before model context. Do not pass secrets or unrestricted request headers to the model.

Use a schema-validated structured output, not regular-expression extraction from free text. Permit at most one schema-repair attempt. Invalid output returns a readable error and no state change. Model outage does not stop deterministic execution of an already approved mandate; it does stop new natural-language compilation unless the user completes the equivalent structured form.

### 6.2 User-facing strategy types

**DCA:** Buy a fixed amount at a fixed UTC interval, subject to live Graph market-health guards and all spending rules. The first eligible schedule slot may start immediately after activation; subsequent runs follow the approved cadence. A missed slot is not accumulated into a burst of catch-up trades.

**Conditional trade:** Buy or sell when an approved Graph metric meets a threshold, subject to a minimum cooldown and a maximum number of executions. P0 must support reference price above/below a threshold. Add completed-hour 24-hour price change only after the historical query is validated.

**Rebalance (P1):** Maintain an approved USDC/asset allocation inside a tolerance band, capped by per-trade and daily notional constraints. Value the execution asset using a fresh executable sell quote into USDC. A proxy Graph price is not a substitute for execution-asset liquidation value.

No automatic direction changes, martingale sizing, model-selected leverage, or hidden optimization. If a constraint prevents the trade, HOLD is correct behavior.

### 6.3 Canonical strategy schema

Implement strict Zod schemas and generated TypeScript types in `packages/domain`. The following is a project-owned contract, not a third-party SDK type. Money is a base-unit decimal string; percentages are integer basis points. All time fields are UTC epoch seconds. Reject unknown fields.

```ts
// Use branded string types for Atomic, Address, Hash, AssetId in real code.
type Trigger =
  | { type: 'schedule'; startAt: number; everySeconds: number }
  | { type: 'reference_price'; comparator: 'lte' | 'gte'; priceUsdc: string }
  | { type: 'completed_24h_change'; comparator: 'lte' | 'gte'; changeBps: number }
  | { type: 'allocation_band'; targetAssetBps: number; toleranceBps: number };

type StrategySpec = {
  schemaVersion: 1;
  marketId: string;
  marketConfigHash: string;
  executionChainId: number;
  type: 'dca' | 'conditional' | 'rebalance';
  side: 'buy' | 'sell' | 'rebalance';
  // Fixed-size buys: USDC atomic units. Fixed-size sells: asset atomic units.
  amountInAtomic: string | null;
  trigger: Trigger;
  guards: {
    minSourceTvlUsd: string;
    maxSourceBlockAgeSeconds: number;
    maxLastSwapAgeSeconds: number;
    requireHealthyGraph: true;
  };
  limits: {
    maxTradeNotionalUsdcAtomic: string;
    maxDailyTurnoverUsdcAtomic: string;
    minUsdcReserveAtomic: string;
    maxAssetAllocationBps: number;
    maxSlippageBps: number;
    cooldownSeconds: number;
    maxExecutions: number;
  };
  mode: 'auto_within_limits' | 'review_each_trade';
  expiresAt: number;
};
```

Conditional validation: DCA is buy-only and uses a schedule; conditional is buy or sell and uses a price/change trigger; rebalance has `side: rebalance`, a band trigger, and `amountInAtomic: null`. P0 UI must hide unimplemented variants. A strategy type appearing in the schema is not a claim of implementation.

Compile response:

```ts
type CompileResult =
  | { kind: 'needs_clarification'; questions: string[]; unsupportedReasons: string[] }
  | { kind: 'draft'; spec: StrategySpec; proposedDefaults: string[];
      plainLanguageSummary: string; sourceObservationIds: string[] };
```

### 6.4 Default testnet safety settings

These are product choices, not sponsor requirements or claims of financial safety. They must be visible at approval.

```text
Suggested starting trading deposit: 10 USDC, after faucet availability check
Suggested fixed buy: 1 USDC
Hard application per-trade principal ceiling: 2 USDC
Hard application daily trading-turnover ceiling: 5 USDC
Minimum retained trading-wallet USDC: 2 USDC
Default maximum execution-asset allocation: 30 percent
Slippage: 50 bps, hard ceiling 100 bps
Default cooldown for price conditions: 3600 seconds
Default scheduled interval: 86400 seconds
Maximum execution count: 3 per approved demo mandate
Maximum mandate duration: 7 days
Maximum funded testnet users: available distinct Circle wallets, at most configured quota
```

Do not auto-refill a trading wallet. Do not include network fees in a cap labeled `trading principal` or `turnover`; present gas separately. A 2 USDC reserve is an application policy, not an absolute loss guarantee. Provider fees, gas behavior, session compromise, and external wallet activity are residual risks.

## 7. Authorization and mandate lifecycle

### 7.1 Authentication

The browser supplies its Privy access token to the API over HTTPS. The server verifies it using the supported SDK, checking issuer/audience/expiry according to Privy's current contract. Get the user identity and linked wallet server-side; never authorize from a user ID or wallet address supplied in a request body. [R25, R26]

Identify the actual embedded Ethereum wallet, not blindly `wallets[0]`. Verify it belongs to the authenticated user. An external wallet login is not a reason to skip embedded wallet creation for the required Privy flow.

Choose bearer-token API authentication for P0. Keep tokens in the supported SDK flow, not custom localStorage copies. If cookies are later used, implement HttpOnly, Secure, SameSite and CSRF defenses. Check Origin for browser mutations, authorize every object by user ID, and rate-limit compilation, funding preparation, and withdrawal requests.

### 7.2 Signed approval

Server creates an immutable draft, canonicalizes the fully validated JSON, computes `keccak256(UTF8(canonicalJSON))`, and returns the exact preview plus EIP-712 message. Use a tested RFC-8785-compatible canonicalizer; never hash whatever JSON key order happens to come from the model.

EIP-712 domain:

```text
name: Arclet
version: 1
chainId: active execution chain
salt: keccak256(UTF8(APP_CANONICAL_ORIGIN))
```

No verifying contract is claimed. The signature authorizes this application, not a deployed smart contract.

Signed `MandateApproval` fields:

```text
owner: address
tradingWallet: address
strategyId: bytes32 (hash of server UUID string)
strategyVersion: uint64
strategyHash: bytes32
marketConfigHash: bytes32
nonce: bytes32 (server-issued, single use)
issuedAt: uint64
expiresAt: uint64
```

The browser signs through Privy. The server recovers/verifies the signer, checks the bound wallet/account, origin, chain, current draft version, nonce, hashes, expiry, and server safety ceilings, then activates in a database transaction. Store the exact JSON, signature, typed message, and hash.

Separate the short-lived signing challenge from the mandate lifetime: persist a server-side `challengeExpiresAt` of five minutes after issue, reject activation after that time, and consume the nonce atomically with activation. The signed `expiresAt` is the mandate's final authorization expiry. An expired signing challenge needs a new server-issued nonce and signature, not a changed lifetime on an old approval.

An edit produces a new draft/version and a new approval. Pausing invalidates queued but unsubmitted work immediately. Replacing a mandate increments an authorization epoch and cancels stale reservations. A worker must re-read this epoch immediately before submission.

### 7.3 Pause and withdrawal

Pause is an authenticated, idempotent API operation. Already broadcast transactions cannot be undone; show them until reconciled. A pause does not automatically sell assets or withdraw funds.

Withdrawal always goes to the same server-verified linked Privy wallet in P0. Bind asset, exact amount, trading wallet, destination, chain, expiry, and single-use nonce in a distinct user-signed withdrawal authorization. Pause the strategy first, acquire the wallet lock, reconcile pending work, refresh balances, retain gas as needed, and submit a transfer through Circle. No arbitrary address input or third-party payment recipient is supported.

Allow withdrawing individual tokens without selling. `Withdraw as USDC` is P1 because it needs a separately approved liquidation trade. Never secretly swap to fulfill a withdrawal. Return tiny gas dust only if the provider supports it and the transfer can be funded; otherwise explain the residual.

## 8. Graph data: live, necessary, and inspectable

### 8.1 Source discovery and validation

Use server-side HTTP POST requests to The Graph's authenticated gateway. The candidate Ethereum Uniswap v3 Subgraph ID below is published in Graph Explorer, but it must pass runtime schema, chain, and freshness validation before use. An Explorer URL's `chain=arbitrum-one` can describe Graph Network infrastructure; it does not establish which chain the Subgraph indexes. [R12, R14]

```text
Candidate Subgraph ID:
5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV

Gateway URL format:
https://gateway.thegraph.com/api/subgraphs/id/<SUBGRAPH_ID>

Authentication:
Authorization: Bearer <GRAPH_API_KEY>
Content-Type: application/json
```

`bun run probe:graph` must discover and record a live deployment, inspect its schema, verify its source network/manifest, discover a suitable pool, and save a sanitized observation. Reject an endpoint with no recent data, indexing errors, an unexpected schema, wrong token addresses, or unverified chain identity. Public Subgraphs can change or become stale; do not trust their title alone. [R12-R15]

Verified source-token candidates from Uniswap's token list: [R23]

```text
Ethereum USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 6 decimals
Ethereum WBTC: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599, 8 decimals
```

Discover an EURC source address from Circle's official EURC registry if that market is selected. Do not reuse the Arc EURC address on Ethereum.

For a candidate pool, verify the exact pair on the source chain using `token0()`, `token1()`, and `fee()`; verify it against its protocol factory where available. Lowercase addresses for Graph entity keys but preserve/check valid addresses at application boundaries. Use an allowlisted registry, not arbitrary token symbols or model-supplied contracts.

### 8.2 Queries to implement

The sample below is for a compatible Uniswap v3 schema. Verify each field/type against the selected deployment before generating client types. The schema in the official repository is a reference, not proof that any particular deployed endpoint matches it. [R13]

```graphql
query DiscoverPools($tokens: [String!]!) {
  pools(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc,
        where: { token0_in: $tokens, token1_in: $tokens }) {
    id
    feeTier
    token0 { id symbol decimals }
    token1 { id symbol decimals }
    totalValueLockedUSD
  }
  _meta { deployment hasIndexingErrors block { number hash } }
}
```

Supply the two verified token addresses, verify they are distinct, and reject pools with any other asset. Choose a healthy pool deterministically; save the choice in approved market configuration. Do not dynamically jump to a different pool for an already signed strategy.

```graphql
query MarketSnapshot($pool: ID!, $poolKey: String!, $block: Int!) {
  pool(id: $pool, block: { number: $block }) {
    id
    sqrtPrice
    token0 { id symbol decimals }
    token1 { id symbol decimals }
    totalValueLockedUSD
    volumeUSD
  }
  swaps(first: 1, orderBy: timestamp, orderDirection: desc,
        where: { pool: $poolKey }, block: { number: $block }) {
    id timestamp transaction { id }
  }
  _meta(block: { number: $block }) {
    deployment hasIndexingErrors block { number hash }
  }
}
```

Resolve an indexed source block first. Snapshot all components at that block where supported. Verify `_meta.block` against the source RPC; if the Graph schema supplies a timestamp, still validate its meaning. Do not add unsupported fields merely because this specification describes them.

For completed-hour metrics, query `poolHourDatas` for the last 48 complete UTC hours, including `periodStartUnix`, `sqrtPrice`, `volumeUSD`, `tvlUSD`, and `pool`. Pin the same indexed block. Validate and persist the full typed operation after schema inspection. The compiler may expose historical triggers only when the adapter proves the required data is complete.

### 8.3 Derived metrics

Use high-precision arithmetic, never floating-point money calculations.

```text
token1PerToken0 = (sqrtPriceX96^2 / 2^192) * 10^(decimals0 - decimals1)
```

Orient this ratio using VERIFIED token addresses so the result is USDC per reference asset. Verify the orientation with token ordering tests. Do not assume `token0Price` names give the direction expected by your UI.

`sourceTvlUsd` is the Subgraph's reported pool TVL estimate. It is NOT available execution depth and is not a safety rating.

Let H be the start of the current UTC hour. For completed-hour calculations:

- Latest completed close: bucket beginning H-1h.
- Close 24 hours earlier: bucket beginning H-25h.
- `completed24hChangeBps = (latestClose / priorClose - 1) * 10000`.
- Recent completed-day volume: buckets [H-24h, H-1h].
- Previous completed-day volume: buckets [H-48h, H-25h].

Require the relevant buckets to exist and denominators to be positive. Missing data is `INSUFFICIENT_HISTORY`, not zero price/volume. Do not manufacture missing candles. Label these as completed-hour metrics, not a precise rolling 24-hour feed.

### 8.4 Freshness and error handling

Project defaults: snapshot fetch cache 30 seconds; source indexed block age at most 180 seconds; source head lag at most 30 blocks; most recent pool swap at most 600 seconds old. These are policy choices and may cause a market to be unavailable. Do not loosen them silently to get a trade.

Query timeout: 10 seconds. Retry read-only calls at most twice with bounded backoff and jitter. HTTP 200 with GraphQL `errors`, null mandatory entities, `hasIndexingErrors`, wrong deployment, malformed decimals, implausible timestamps, or inconsistent source RPC blocks is a failed observation.

Graph outage or staleness -> HOLD all data-dependent strategies. Never substitute a cached fixture, another analytics API, or direct RPC prices for the load-bearing Graph signal and claim eligibility. RPC may verify receipts, token identities, and timestamps; it does not replace the Graph signal source.

### 8.5 Provenance record

Every observation stores: ID, environment, provider, gateway host without credentials, Subgraph ID, deployment ID, source chain ID, pool ID, token addresses/decimals, query name/hash, source block number/hash/time, fetch time, latest swap time, raw-response hash, normalized metrics, freshness result, and mapping to execution assets.

Every decision references an immutable observation ID. `GET /api/decisions/:id` returns the normalized evidence and a sanitized source excerpt. Do not put API keys in explorer links, logs, HAR files, or screenshots.

## 9. Circle integration and execution adapter

### 9.1 Setup and identity

Use an actual Circle Agent Wallet. The operator explicitly completes terms acceptance and email OTP outside the application's LLM. Do not give the agent inbox access, hardcode OTPs, accept legal terms on behalf of the operator, or create a raw-key local wallet as a shortcut. The official quickstart documents `@circle-fin/cli` and a testnet authentication mode. [R17]

Run the CLI in the worker with an isolated persistent home directory, not in the browser or a stateless edge runtime. The configured `CIRCLE_HOME` below is an application setting mapped to the child process's `HOME`; it is not assumed to be an official CLI environment variable. Inspect where the pinned CLI actually stores credentials and mount the appropriate protected directory. Never commit that directory or bake it into an image.

Record CLI version and real sanitized JSON fixtures during Phase 0. Provider output schemas and status fields must be learned from the pinned release, not invented from this specification.

### 9.2 Documented command shapes

These demonstrate supported command families, with configuration values substituted safely as argument-array elements. Verify flags with the pinned CLI's help. [R9, R17]

```sh
circle wallet login operator@example.com --testnet
circle wallet list --type agent --chain ARC-TESTNET --output json
circle wallet create --type agent --testnet --idempotency-key <UUID>
circle wallet swap USDC 1 EURC --chain ARC-TESTNET --quote
circle wallet swap USDC 1 EURC <MIN_OUT_DECIMAL> --address <TRADER> --chain ARC-TESTNET --slippage-bps 50 --idempotency-key <UUID>
circle transaction list --address <TRADER> --chain ARC-TESTNET --output json
```

The same swap family may use verified token addresses. A quote proves neither liquidity at a later time nor settlement success. A docs example is not a smoke test.

### 9.3 Narrow project-owned interface

```ts
interface CircleTradingAdapter {
  health(): Promise<AdapterHealth>;
  listWallets(): Promise<VerifiedAgentWallet[]>;
  quote(request: QuoteRequest): Promise<NormalizedQuote>;
  submitSwap(request: AuthorizedSwap): Promise<SubmissionReference>;
  submitTransfer(request: AuthorizedWithdrawal): Promise<SubmissionReference>;
  reconcile(reference: SubmissionReference): Promise<ExecutionStatus>;
}
```

Define these types in the repo. The adapter translates provider output into them. Do not present them as methods available in a Circle SDK.

Use `spawn`/`execFile` with `shell: false`, an absolute pinned executable path, restricted environment, output size limits, and timeouts. All command verbs/options come from application code. Validate addresses, token registry membership, fixed-point decimal strings, and chain identifiers before serialization. No user or model text is ever a shell fragment.

The runtime executor only receives an immutable authorized action after checks. Provisioning, session login, terms acceptance, policy changes, and arbitrary contract execution are NOT exposed to the runtime model or public API.

### 9.4 Quote and execution rules

A normalized quote records input/output assets, exact input, estimated output, creation time, any provider expiry, supported minimum output, route/provider identity where supplied, and fee fields with `known`/`unknown` status. Never fill absent fee, price-impact, or expiry fields with invented values.

For exact-input swaps:

```text
minOutAtomic = floor(quotedOutAtomic * (10000 - slippageBps) / 10000)
```

Require positive input/output, `minOutAtomic > 0`, exact token/chain match, correct owner wallet, and a quote no older than 20 seconds at submission, or a tighter provider expiry. Pass minimum output and explicit slippage; do not rely on a provider default that may be wider. Verify in the live smoke test that the supplied minimum is honored. [R18]

If provider routing can resubmit or requote internally, establish how the bound is preserved. If it cannot be established, mark the route unavailable for autonomous mode.

Keep execution-price protection separate from Graph proxy signals. For portfolio allocation, obtain a fresh sell quote for the execution asset into USDC. If that quote is unavailable, allocation-dependent execution must HOLD. For testnet proxy signals, do not pretend Graph WBTC price and Arc cirBTC price must coincide.

Network fees may not be known before a CLI swap. Display that fact, retain a conservative buffer, and record actual fees afterward. Do not promise a hard gas cap unless the adapter/provider has verified enforcement. A hard total-funds guarantee is not provided by this MVP.

### 9.5 Reconciliation and idempotency

Use Circle's documented swap idempotency key where supported. Generate and persist it BEFORE submission; retry the same economic action with the same key, never a new one simply because a request timed out.

Not every command documents idempotency. For transfers or ambiguous responses, persist the pending action, inspect provider transaction history and Arc receipts, and stop the wallet until the result is known. Do not blindly replay a transfer.

A provider response or process exit code is not sufficient. Resolve all related transaction IDs/hashes, wait for successful receipts, identify actual token balance changes and fees, and link them to the action. Quote amounts are not fills. If the provider emits multiple transactions, record the whole sequence.

If submission may have occurred but cannot be matched reliably, mark `UNKNOWN`, retain the reserved budget, freeze further wallet mutations, and present an operator reconciliation task. Never label a timeout `FAILED` and free the money for another trade without evidence.

## 10. Privy integration

Configure email login and embedded Ethereum wallet creation using the pinned Privy React SDK. Configure Arc as a supported EVM network; do not assume Arc-specific gas sponsorship, onramp coverage, or smart-account bundlers. The standard EVM signing/transaction flow is the required generally available feature. [R19, R20]

Build the funding transaction with the verified ERC-20 USDC address, ABI-encoded `transfer(tradingWallet, amountAtomic6)`, `value: 0`, and the correct chain. Send it using the Privy embedded wallet via its supported React transaction hook or EIP-1193 provider. Verify chain switching explicitly.

The server creates a funding intent binding user, source/destination wallets, chain, token, exact amount, and expiry. After the browser reports a transaction hash, the server independently verifies the receipt, sender, chain, emitter, recipient, and amount. A supplied hash is not proof by itself. Use `(chainId, transactionHash, logIndex)` uniqueness for ERC-20 movement crediting.

Unexpected external deposits may alter onchain balances but must not produce false Privy integration evidence. Show them as external/unmatched inflows. Never treat a Circle faucet deposit alone as a Privy financial flow.

Onboarding acceptance: the demo user can log in without an extension, obtain an embedded wallet, fund the trading wallet through a real wallet action, and inspect the result. Preserve confirmation UI for money-moving actions. Do not request raw private keys or seed phrases.

## 11. Deterministic policy engine

Implement a pure function in `packages/policy` that accepts an approved strategy, market observation, fresh portfolio/quotes, current UTC time, and budget/execution history. It returns a structured HOLD or proposed action. It must not call an LLM, mutate the database, or submit a transaction.

### 11.1 Evaluation order

1. Runtime environment is permitted; credentials and provider health are valid; global kill switch is off.
2. User/trading-wallet ownership mapping is unique and active; strategy signature/version/epoch/config hash match; approval has not expired.
3. No unresolved submission, active withdrawal, or other reserved action exists for the wallet.
4. Graph observation is live, healthy, fresh, and from the approved deployment/pool/source chain; mandatory history exists.
5. Trigger is due/met. Cooldown, total execution count, schedule-window deduplication, and UTC-day limits pass.
6. Actual onchain balances and any pending outflows are reconciled. Required executable valuation quotes are fresh.
7. Input amount is positive, available, and within the per-trade ceiling. Reserve remains after the trade and conservative gas buffer. No automatic partial fill/shrinking unless the approved strategy type explicitly permits it.
8. Daily trading principal turnover, concentration cap, token allowlist, supported direction, and user/application limits all pass.
9. Fresh execution quote and minimum-output protections pass. Re-read strategy epoch and reserved budget under the wallet lock immediately before submission.

Return all relevant checked facts and rejection codes, not just a boolean. Suggested codes:

```text
PAUSED, EXPIRED, WRONG_ENVIRONMENT, CONFIG_CHANGED, UNAUTHORIZED,
WALLET_CAPACITY, SESSION_UNAVAILABLE, DATA_STALE, INDEXING_ERROR,
INSUFFICIENT_HISTORY, TRIGGER_NOT_MET, NOT_DUE, COOLDOWN,
EXECUTION_COUNT, INSUFFICIENT_BALANCE, RESERVE_VIOLATION,
DAILY_LIMIT, TRADE_LIMIT, ALLOCATION_LIMIT, QUOTE_UNAVAILABLE,
QUOTE_EXPIRED, UNSUPPORTED_MARKET, PENDING_RECONCILIATION,
INVALID_MIN_OUT, PROVIDER_REJECTED, GLOBAL_KILL_SWITCH
```

### 11.2 Accounting definitions

**Daily turnover:** Sum of reserved and confirmed trade input notional in USDC, plus failed trades' explicitly charged principal if any. Buys use exact USDC input. Sells use the fresh quoted USDC proceeds as a conservative application-level notional, with any separately approved valuation buffer. This is a trading-volume control, not an all-cost or all-loss guarantee. Gas and provider fees are shown separately. Owner-authorized withdrawals do not count as trading turnover but still require balance/gas/ownership checks.

**Daily boundary:** UTC midnight. Reserve against the actual prospective submission day, not a stale job creation day. If the day changes before submission, release/re-reserve transactionally and rerun policy checks. Keep budget reservations for UNKNOWN actions even across midnight until reconciled; reserved token balances remain unavailable globally.

**Available USDC:** Onchain atomic balance minus known pending outbound principal, retained reserve, and a documented conservative gas buffer. Do not add native and ERC-20 balance representations. Unexpected balance changes cause reconciliation before another action.

**Allocation:** For a two-asset account, use the execution asset's fresh sell-quote value in USDC and the actual USDC balance. For a proposed buy, quote the resulting asset balance or conservatively compute/validate its valuation at the prospective size. HOLD if a meaningful valuation cannot be produced. Do not substitute a guessed USD price.

**Trade result:** Use real reconciled input/output quantities, not quote estimates. Do not show P&L unless funding, fees, token movements, and valuation assumptions are complete. P0 can omit P&L entirely.

### 11.3 Schedule and trigger semantics

Schedule window key is derived from the approved `startAt` and `everySeconds`. Execute at most once per window. After a long outage, consider only the current window; never catch up old buys in a burst.

A price condition is level-triggered: it can execute again only after the approved cooldown, within remaining count and daily caps. State this explicitly; remaining below a threshold is not a new event every poll. For P0, default to a one-execution conditional mandate in the UI. More than one requires explicit approval.

Rebalance uses hysteresis: do nothing inside the band; outside it, move toward the target, capped by per-trade/daily limits and cooldown. A zero or sub-minimum trade is HOLD, not a gas-consuming no-op.

## 12. Persistent worker and transaction state machine

### 12.1 Worker execution model

Use a persistent Node process. Suggested polling: scheduler every 15 seconds, data refresh every 30-60 seconds, pending-transaction reconciliation every 5 seconds with provider-aware backoff. These are system polling intervals, not authorization to trade at that frequency.

One active mandate per trading wallet in P0. This deliberately avoids cross-strategy budget conflicts. A replacement is a new version or a new mandate activated after pausing the old one.

Use a dedicated PostgreSQL connection and a per-wallet advisory lock for the entire mutation/submission critical section. Use row-level transactions for state transitions. Database-backed job leases with fencing prevent abandoned workers from racing their replacements. A worker that loses its lease must not submit.

Never hold a SQL transaction open while waiting for a slow model or provider. Instead, persist the action/reservation under a short transaction, keep the wallet-level execution lease, perform the external step, and write the result in another short transaction. On ambiguous external failure, stop the wallet for reconciliation.

### 12.2 Strategy state

```text
DRAFT -> AWAITING_SIGNATURE -> ACTIVE
ACTIVE -> PAUSED | EXPIRED | COMPLETED | NEEDS_ATTENTION
PAUSED -> AWAITING_SIGNATURE -> ACTIVE (when a new approval is required)
```

Re-activating an unchanged, unexpired approved strategy may be allowed through an authenticated explicit resume action, but must not reset counts, cooldowns, or budgets. Any changed spec requires a signature. Expired or completed strategies require a new mandate.

### 12.3 Execution state

```text
EVALUATING -> HOLD
EVALUATING -> QUOTED -> RESERVED -> SUBMITTING
SUBMITTING -> SUBMITTED -> CONFIRMED
SUBMITTING -> UNKNOWN
SUBMITTED -> UNKNOWN | FAILED | CONFIRMED
UNKNOWN -> CONFIRMED | FAILED (only after positive reconciliation evidence)
RESERVED -> CANCELLED (only if submission definitely did not occur)
```

Store the authorized action, quote, signature reference, observation IDs, provider idempotency key, and budget reservation before entering SUBMITTING. For a single economic action, never create a replacement idempotency key while the first outcome is unknown.

On a restart, reconcile SUBMITTING/SUBMITTED/UNKNOWN actions before evaluating new strategies. A confirmed trade updates balances, budget usage, execution count, and cooldown atomically in the database. Processing the same receipt twice must be a no-op.

### 12.4 Pause races and failure behavior

Pause prevents future submissions once the worker observes the changed epoch; an already transmitted request may still settle. The UI must not imply otherwise. A global kill switch prevents new trading submissions while allowing read-only reconciliation and appropriately authorized recovery withdrawals.

Three consecutive provider/data errors move a strategy to a visible degraded state without loosening rules. Automatic retries of reads are bounded. Mutations follow the idempotency/reconciliation rules, not generic HTTP retry middleware.

## 13. Data model

Implement database migrations; do not use an in-memory array as durable state. All tenant-owned rows carry `user_id`; every API read/mutation enforces ownership. Financial quantities use PostgreSQL integer-safe `numeric(78,0)` or validated decimal strings, never float/double. API JSON serializes them as strings.

| Table | Essential fields and constraints |
|---|---|
| `users` | UUID; unique Privy user ID; embedded wallet address; created time; invite/access status |
| `trading_wallets` | UUID; unique Circle wallet ID; chain/address unique; user association unique for P0; operating mode; assignment status; no raw credentials |
| `wallet_snapshots` | Wallet; block/hash/time; native USDC atomic18; ERC-20 balances atomic; token metadata version; reconciliation state |
| `funding_intents` | User/source/destination/token/chain/amount; expiry; status; confirmed receipt reference |
| `strategies` | Owner; trading wallet; current version; state; authorization epoch; next evaluation; pause reason |
| `strategy_versions` | Strategy/version unique; original instruction; canonical spec; spec hash; market config hash; creation time; immutable |
| `authorizations` | Purpose; user; nonce unique; typed message; signature; hash; challenge expiry; mandate expiry; consumed/revoked state |
| `market_observations` | Provenance and normalized metrics from section 8; payload hash; data-quality verdict; immutable |
| `decisions` | Strategy version; observation; input portfolio/quotes; evaluator version; result/reasons; proposed action; timestamps |
| `executions` | Decision; wallet; state; economic action key unique; provider idempotency key unique; submitted payload hash; provider IDs; quote; actual input/output |
| `execution_transactions` | Execution; chain/hash unique; role; receipt status/block; actual gas fee; log references |
| `budget_reservations` | Wallet; execution unique; UTC day; reserved notional/token amount; state; commit/release time |
| `daily_usage` | Wallet/UTC day unique; confirmed principal turnover; count; fee totals; updated atomically |
| `withdrawals` | User; wallet; fixed destination; token/amount; authorization; state; provider and receipt references |
| `jobs` | Type; payload; dedupe key unique; scheduled time; lease owner/expiry/fencing token; attempts; terminal state |
| `audit_events` | Actor; user; action; target; timestamp; correlation ID; sanitized metadata; append-only application access |

Maintain durable unique economic keys for schedule windows and approved one-shot conditions. Do not rely solely on frontend button disabling or a queue's at-least-once delivery.

Encrypt private stored message content where operationally feasible; minimize retained personal information. Raw provider payloads and chat may contain sensitive data. Public evidence uses an explicit redacted export, not a database dump.

## 14. HTTP API contract

Implement under `apps/web/app/api`. All monetary/state-changing endpoints require verified authentication, authorization, strict input schemas, rate limits, and a persisted request idempotency key where specified. Errors use:

```json
{
  "error": {
    "code": "DATA_STALE",
    "message": "The approved market source is stale. No trade was submitted.",
    "requestId": "server-generated-correlation-id",
    "retryable": true
  }
}
```

Never return secrets, complete Circle CLI output, or stack traces to a browser. Suggested status codes: 400 validation, 401 auth, 403 ownership/policy, 409 state conflict, 422 unsupported strategy, 429 limit, 503 dependency unavailable.

| Method/path | Behavior |
|---|---|
| `GET /api/health` | Public shallow liveness only; no secrets, addresses, or dependency credentials |
| `GET /api/readiness` | Authenticated setup/capability status with actionable missing items |
| `GET /api/me` | Verified user, linked personal wallet, assigned trading wallet, access and environment |
| `POST /api/trading-wallet/claim` | Assign an unused pre-provisioned wallet under a transaction; idempotent; fail at capacity |
| `GET /api/portfolio` | Reconciled actual balances, reference labels, pending actions, freshness, no invented P&L |
| `POST /api/funding-intents` | Bind a proposed Privy USDC transfer and return unsigned transaction details |
| `POST /api/funding-intents/:id/confirm` | Verify supplied receipt independently; idempotent receipt consumption |
| `GET /api/markets` | Enabled/disabled markets and verified capabilities; no private RPC credentials |
| `GET /api/markets/:id/observation` | Latest validated live evidence or clear unavailable state |
| `POST /api/chat` | Bounded conversation and read-only tools; may propose a draft, never activate or send money |
| `POST /api/strategies/compile` | Natural language + market ID -> typed draft or clarification |
| `POST /api/strategies` | Save a strict structured-form draft; same validation path as AI output |
| `GET /api/strategies/:id` | Current state/version and immutable approved rules |
| `POST /api/strategies/:id/approval-challenge` | Issue nonce and exact EIP-712 payload for the current draft |
| `POST /api/strategies/:id/activate` | Verify signature, consume nonce, activate atomically |
| `POST /api/strategies/:id/pause` | Immediate durable pause; no LLM dependency; idempotent |
| `POST /api/strategies/:id/resume` | Explicit resume of an unchanged valid mandate; preserve history/caps |
| `POST /api/strategies/:id/evaluate` | Authenticated preview or enqueue a normal worker evaluation; never bypass controls |
| `GET /api/activity` | Cursor-paginated tenant-scoped decisions/executions/withdrawals |
| `GET /api/decisions/:id` | Stored reasoning inputs, rule outcomes, and provenance |
| `POST /api/withdrawals/challenge` | Exact withdrawal proposal to verified personal wallet; issue single-use nonce |
| `POST /api/withdrawals` | Verify signed proposal; pause and enqueue recovery flow; idempotent |
| `GET /api/withdrawals/:id` | Current status and receipts |
| `GET /api/events` | Optional authenticated fetch-based stream; use polling for P0 rather than insecure token-in-URL SSE |

For P1 per-trade review, add approval-challenge/approve endpoints bound to decision hash, exact quote/minimum output, wallet, and expiry. A stale approval cannot authorize a newly priced trade. Do not ship a visible per-trade approval option until this is implemented.

## 15. Repository layout

The build agent creates this repository; only SPEC.md, AGENT.md, and PROMPT.md are supplied now. Paths below are target implementation paths, not claims that code already exists.

```text
arclet/
  SPEC.md
  AGENT.md
  PROMPT.md
  AGENTS.md                       # Agent-generated compatibility pointer to AGENT.md
  README.md
  LICENSE
  .gitignore
  .env.example
  .bun-version
  bunfig.toml                    # only when configuration is needed
  package.json                     # set packageManager to the pinned Bun version
  bun.lock
  tsconfig.base.json
  eslint.config.mjs
  vitest.config.ts
  playwright.config.ts
  compose.yaml
  apps/
    web/
      package.json
      Dockerfile
      next.config.ts
      app/
        layout.tsx
        page.tsx
        providers.tsx
        wallet/page.tsx
        activity/page.tsx
        settings/page.tsx
        api/                      # Route handlers from section 14
      components/
        onboarding/
        wallet/
        chat/
        strategies/
        evidence/
      lib/
        auth.ts
        api-client.ts
        privy.ts
        server-services.ts
    worker/
      package.json
      Dockerfile
      src/
        index.ts
        scheduler.ts
        wallet-lock.ts
        evaluate-job.ts
        submit-job.ts
        reconcile-job.ts
        withdrawal-job.ts
  packages/
    domain/src/
      assets.ts
      strategy.ts
      authorization.ts
      execution.ts
      errors.ts
      money.ts
      canonical-json.ts
    policy/src/
      evaluate.ts
      sizing.ts
      scheduling.ts
      guards.ts
    graph/src/
      client.ts
      discover.ts
      schema-validation.ts
      normalize.ts
      provenance.ts
      queries/
        discover-pools.graphql
        market-snapshot.graphql
        pool-history.graphql
      generated/                  # Generated from the validated deployed schema
    circle/src/
      adapter.ts
      process-runner.ts
      normalize.ts
      quote.ts
      reconcile.ts
      schemas.ts
    agent/src/
      compiler.ts
      explainer.ts
      tools.ts
      model-provider.ts
      prompts/
        compiler.md
        explainer.md
    chain/src/
      clients.ts
      balances.ts
      receipts.ts
      tokens.ts
    db/
      drizzle.config.ts
      migrations/
      src/schema.ts
      src/client.ts
      src/repositories/
  config/
    runtime.ts
    markets.json
    dependency-versions.json
    chains/arc-testnet.json
    chains/arc-mainnet.json
  scripts/
    doctor.ts
    probe-arc.ts
    probe-graph.ts
    probe-circle.ts
    provision-wallets.ts
    verify-live-flow.ts
    export-evidence.ts
    check-readiness.ts
    check-mainnet-readiness.ts
  tests/
    unit/
    integration/
    e2e/
    live/
    fixtures/                     # Offline-only, clearly labeled synthetic/redacted
  docs/
    STATUS.md
    DECISIONS.md
    BLOCKERS.md
    PRIZE_REQUIREMENTS.md
    SECURITY.md
    PRIVACY.md
    AI_USAGE.md
    HUMAN_CONTRIBUTIONS.md
    THIRD_PARTY.md
    DEPENDENCIES.md
    TEST_REPORT.md
    DEMO_SCRIPT.md
    PRESENTATION.md
    MAINNET_RUNBOOK.md
    SOURCES.md
    architecture.mmd
    architecture.svg
    evidence/
      manifest.json
      graph/
      circle/
      privy/
      screenshots/
  .github/workflows/ci.yml
```

Do not create every listed file as an empty stub and claim the architecture is complete. Implement one passing vertical slice, then expand. Remove unimplemented P1 UI and label deferred files/capabilities in STATUS.md.

## 16. Environment and operator prerequisites

### 16.1 `.env.example` contract

These names are project-owned except standard provider key names. Supply no real secret values in the repository.

```dotenv
APP_ENV=arc-testnet
APP_CANONICAL_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://intent:local_dev_only@localhost:5432/intent_wallet
NEXT_PUBLIC_APP_ENV=arc-testnet
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_ID=
PRIVY_APP_SECRET=
ARC_RPC_URL=https://rpc.testnet.arc.io
SOURCE_RPC_URL=
GRAPH_API_KEY=
GRAPH_SUBGRAPH_ID=5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV
AI_PROVIDER=openai-compatible
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
CIRCLE_CLI_PATH=
CIRCLE_HOME=
CIRCLE_CHAIN=ARC-TESTNET
DEMO_USER_ALLOWLIST=
MAX_FUNDED_USERS=5
MAX_TRADE_USDC_ATOMIC=2000000
MAX_DAILY_TURNOVER_USDC_ATOMIC=5000000
MIN_USDC_RESERVE_ATOMIC=2000000
MAX_SLIPPAGE_BPS=100
TRADING_ENABLED=false
ALLOW_MAINNET=false
MAINNET_APPROVED_COMMIT=
EVIDENCE_DIR=./docs/evidence
```

Do not assume a Circle API key alone replaces the CLI's authenticated wallet session. This architecture uses the Agent Wallet CLI session; add an environment-specific Circle API key only if a verified optional integration needs one. Do not request an entity secret for this design merely because other Circle wallet SDKs use one.

Public environment variables may contain only public IDs and labels. No Graph key, server secret, Circle credential, database URL, or model key may have a `NEXT_PUBLIC_` prefix.

### 16.2 Manual setup checklist

The human creates/configures the Privy app, allowed origins, email login, and embedded wallet settings; obtains a Graph API key and a source-chain RPC endpoint; provides a working model API credential/model ID; reviews and completes Circle terms/login; funds test wallets using approved faucet flows; and explicitly authorizes testnet submission.

The agent must not claim these steps are completed without evidence. With missing credentials it should still implement and test offline components, render the UI, provide exact setup instructions, and report the blocked live gates. It must not silently substitute fake integrations.

### 16.3 Required project scripts

**Package-manager rule:** for this from-scratch Arclet repository, use Bun. If code is later imported from a GitHub repository that already uses pnpm, keep pnpm within that inherited workspace and document the exception in `docs/DECISIONS.md`; do not mass-convert lockfiles during the hackathon. Any command examples below use Bun for the default Arclet workspace.

Every command documented in README must exist and be verified. Define:

```text
bun run dev                  web + worker against local database
bun run dev:web              web only
bun run dev:worker           persistent worker only
bun run build                type-safe production build of all shipped packages
bun run lint                 lint all shipped code
bun run typecheck            strict workspace type check
bun run db:migrate           apply checked-in migrations
bun run db:seed              seed configuration only; no fictional live trades
bun run test                 offline unit suite
bun run test:integration     database/adapter contract tests
bun run test:e2e             deterministic browser suite
bun run doctor               non-mutating dependency/configuration report
bun run probe:arc            chain/token/decimal read-only probes
bun run probe:graph          authenticated live data and schema probe
bun run probe:circle         read-only session/wallet/quote probes
bun run provision:wallets    explicit operator-only wallet creation/assignment prep
bun run verify:live          opt-in real testnet flow verification, never auto-run in CI
bun run evidence:export      redact and export actual evidence
bun run check:readiness      submission gate report; exit nonzero for missing P0 proof
bun run check:mainnet         production follow-through gate report; no transactions
bun run docs:diagram         render architecture.mmd to architecture.svg
```

`verify:live` requires `APP_ENV=arc-testnet`, `TRADING_ENABLED=true`, verified invited-user ownership and explicit command-line confirmation of network/max spend. No script should move mainnet funds merely because an API key is present.

## 17. Security and failure requirements

### 17.1 Threats to cover

Prompt injection through chat or token metadata; wrong user/wallet association; shell injection; credential leakage; duplicate trades from retries; stale quotes; unhealthy Graph data; incorrect decimals; chain/address confusion; replayed approvals; concurrent withdrawals; server compromise; provider custody/control limitations; and misleading testnet/mainnet UI.

Protect against cross-user access with database ownership checks, not guessed UUID secrecy. Protect against replay with consumed nonces, immutable hashes, expiries, and origin/chain binding. Limit payload sizes, model tokens, tool-call count, and query complexity.

### 17.2 Process and credential isolation

Only the Circle adapter process runner may access the CLI credential mount. Model prompts and browser requests cannot read it. Use a non-root worker container, read-only application filesystem where practical, restricted network egress, and encrypted secret storage. CLI logs must be redacted before persistence. Never log access tokens, signatures in public logs, full environment variables, or private wallet session files.

The Circle starter kits demonstrate agent integration, but some provide broad shell tools. Borrow only the relevant integration patterns; do NOT expose those broad shell tools to this product's user-facing agent. Record reused upstream commits/licenses. [R24]

### 17.3 Mainnet safety boundary

`ALLOW_MAINNET=false` is the default in code and example configuration. Server startup rejects conflicting environment/chain labels, missing verified assets, or a production environment using testnet sessions. Live mainnet changes require a reviewed commit and explicit human release approval.

Application limits are not cryptographic protection from an operator. Provider spending controls, when available, are defense in depth; verify which operations they cover, including swaps/approvals and asset conversions. Do not infer that a USDC transfer limit bounds arbitrary contract calls or all economic exposure. [R8]

Public real-money deployment requires a documented custody/authorization design and relevant legal/compliance review. A small operator-only mainnet deployment for the prize condition is not proof of a production-safe consumer financial service.

### 17.4 Forbidden shortcuts

No arbitrary token/address input to execution; no raw-key import of the Privy wallet; no blanket unlimited token allowance without an explicit reviewed justification; no automatic fallback to a private key; no force-execute endpoint; no browser-stored Circle session; no naked `eval`; no SQL string concatenation; no fake risk score; no hidden fixture injection in live mode; no unbounded HTTP mutation retries.

If an upstream swap internally creates approvals, record the actual spender and allowance behavior during the probe. Disclose and disable the route if it cannot meet the reviewed security requirements. The app cannot promise bounded approvals without checking the provider's implementation.

## 18. Tests and acceptance criteria

### 18.1 Offline unit tests

At minimum test:

- Strategy schema: valid variants, unknown fields, malformed token IDs, oversized values, zero/negative amounts, unsupported ETH requests, vague instructions, impossible allocations, and expiry.
- Compiler: strict output, clarification behavior, explicit defaults, invalid-output retry limit, malicious prompt content, no activation side effects.
- Monetary arithmetic: six/eighteen/eight-decimal distinctions, huge integers, rounding down minOut, floor conversion of native USDC dust, no float conversion.
- Graph normalization: token-order reversal; source/execution token distinction; stale block, stale swap, indexing errors, partial GraphQL errors, wrong chain, absent history, completed-hour boundaries.
- Policy: exact limits, one atomic unit over/under limits, reserve and gas buffer, allocation bounds, cooldown, max executions, midnight crossover, no catch-up DCA, stale config hash.
- Authorization: nonce replay, old version, wrong origin/chain/wallet, expired signature, wrong purpose, unchanged resume cannot reset usage.
- Adapter: argument-array construction, malicious shell input rejection, quote parsing, unsupported statuses, unknown fee fields, JSON truncation, timeout ambiguity.

Use property-based tests for accounting invariants where helpful: values never become negative; maxOut/minOut rounding cannot loosen a bound; a failed mandatory guard cannot produce an executable action; duplicate inputs cannot generate two economic executions.

### 18.2 Integration tests

Use real PostgreSQL for locks/migrations/constraints. Provider mocks here are allowed and must be explicitly labeled. Test two workers racing one wallet, pause during quote preparation, restart after SUBMITTING, repeated provider callback/result, concurrent withdrawal, state rollback, lease expiry, stale quote after approval, and UNKNOWN never freeing a reservation prematurely.

An adapter contract test should consume sanitized responses captured from the pinned Circle CLI version. Synthetic fixtures alone do not establish provider compatibility.

### 18.3 Browser tests

A deterministic offline test auth/provider harness may be used only in an explicitly separate `test` environment. Production/testnet bundles and routes must not accept a mock-auth bypass.

Cover onboarding, missing-provider setup screens, correct custody disclosure, funding form validation, draft review, signing cancellation, activation, HOLD explanation, activity receipt links, pause, withdrawal form, unsupported asset messaging, mobile layout, and keyboard navigation.

### 18.4 Live tests - not optional for a qualifying claim

| ID | Acceptance test | Evidence |
|---|---|---|
| L1 | Arc RPC reports configured chain; USDC metadata and native/ERC-20 scale relation verified | Sanitized probe with timestamp/block |
| L2 | Privy creates/uses an actual embedded wallet and signs a real USDC funding transfer | Privy flow screen + Arc receipt + verified token movement |
| L3 | Circle session returns an actual Agent Wallet and a supported quote in both directions for enabled market | CLI version, wallet type/address, redacted outputs |
| L4 | Authenticated Graph query returns fresh real data from verified deployment/source/pool | Raw-response hash, sanitized response, block and metric derivation |
| L5 | User-signed conditional mandate plus L4 produces a real autonomous Circle swap on Arc | Mandate hash, decision trace, submission IDs and successful receipts |
| L6 | Removing Graph access or making a guard fail prevents submission, without fallback fake data | HOLD trace; no execution request issued |
| L7 | A duplicate job/restart does not cause an extra swap | Execution key/provider idempotency/receipt count |
| L8 | Pausing prevents subsequent new submissions | Pause epoch, worker trace; pending transaction disclaimer |
| L9 | Approved return transfer reaches the same Privy wallet | Successful Arc receipt and reconciled balances |
| L10 | No secrets or misleading live/mainnet claims in the public export | Secret scan + human review |

If L5 cannot run because a condition genuinely does not pass, use a newly signed, explicitly demo-sized threshold based on the real observed metric, or demonstrate a scheduled buy with real market-health guards. Do not alter a feed, hide a force flag, or label a static replay as live. To prove a conditional strategy itself, its actual approved condition must pass once.

### 18.5 Test report honesty

`docs/TEST_REPORT.md` records command, commit, environment, timestamp, pass/fail/skipped, and exact blocker. `Not run: missing Graph key` is not a pass. Screenshots and hashes must come from real runs. Do not invent successful transactions, addresses, or confirmations.

## 19. Deployment and operations

### 19.1 Local development

Create the workspace, resolve/pin dependencies, start PostgreSQL, apply migrations, run configuration doctor, then run web and worker. Bootstrap Circle authentication in the same isolated persistent environment the worker will use. Configure Privy localhost origin and supplied credentials. Do not run two workers against a non-locking in-memory database.

Suggested developer sequence after scaffolding exists:

```sh
bun install --frozen-lockfile
cp .env.example .env
# Human supplies credentials and completes Circle login separately.
docker compose up -d db
bun run db:migrate
bun run doctor
bun run probe:arc
bun run probe:graph
bun run probe:circle
bun run dev
```

The first install that creates the lockfile is performed without `--frozen-lockfile`; all reproducible installs afterward use it. README must say this explicitly.

### 19.2 Hosted demo

Deploy the web/API and a continuously running worker with a shared managed PostgreSQL database. A web-only serverless host is insufficient. The worker needs the pinned CLI binary and protected persistent credential storage. Configure HTTPS, allowed Privy origins, canonical approval origin, health checks, secret injection, and distinct environments.

Do not bake authentication sessions into public images. Do not scale mutation workers until wallet serialization and reconciliation tests pass. Health dashboards show last successful Graph fetch, last worker heartbeat, unresolved executions, and session health without exposing secrets.

### 19.3 Recovery playbook

- Graph outage: HOLD, explain, retry reads conservatively; do not swap data providers silently.
- Circle session expires: stop new submissions, reconcile via reads where possible, request operator reauthentication, preserve all funds/state.
- RPC outage: do not claim finality; leave pending and retry reads.
- Ambiguous submission: freeze that wallet, inspect provider and chain history; no replay with a new key.
- User reports unexpected funds: pause, snapshot, reconcile full token movements; do not erase rows.
- Compromised secret: global kill switch, revoke/rotate provider session through official controls, investigate, recover funds with explicit user/operator authorization.
- Lost database: do not infer mandate approval from balances; restore backups and reconcile. Never resume automation with invented authorization history.

## 20. Mainnet follow-through by September 30

This is a separate release gate, not permission to turn off safety checks. The sponsor conditions $2,500 of the Circle prize on deployment of the same project to Arc Mainnet by September 30. Confirm the sponsor's expected evidence and cutoff timezone; the posted condition does not specify them. Target evidence delivery before that date rather than guessing an end-of-day timezone. [R2]

The research verified a scheduled September 16 public launch, not successful availability of all required mainnet APIs/tokens. [R21]

Required gates:

1. Confirm actual public network availability, chain ID, official RPC/explorer, and separately verified token addresses.
2. Confirm Circle Agent Wallet support for the mainnet identifier, session type, quote/execute flow, status reconciliation, and relevant provider controls.
3. Confirm a real supported Arc trading pair, liquidity, both-direction quotes, and safe minimum-output behavior. Testnet pair support is not proof of mainnet pair support.
4. Keep the same product, strategy engine, live Graph integration, Privy flow, and public repository lineage. Pin a reviewed release commit. A landing page saying `mainnet` is not an onchain deployment.
5. Use separate database, secrets, Circle session, origin, and environment. Never migrate active testnet approvals as real-money approvals; users must sign anew.
6. Conduct threat-model review, dependency/secret scans, recovery rehearsal, and operator-only tiny-value transactions approved by the human. Default to no public deposits.
7. Capture a real Privy flow, Graph-derived decision, Circle-mediated Arc trade, and return transfer with actual receipts and explorer links. Record any capability difference from testnet.
8. Publish the environment configuration/evidence without secrets and provide it to the sponsor through the official channel. Do not self-certify that the conditional award is earned.

The deployment script/readiness check must fail closed if a required capability is unsupported. Do not switch execution to Base and call it Arc, reuse testnet tokens, or produce a nonfunctional mainnet page merely to meet the date.

## 21. Implementation milestones

Milestones are ordered by integration risk, not by visual appeal. See AGENT.md for the execution procedure and commit discipline.

| Milestone | Required outcome | Gate before proceeding |
|---|---|---|
| M0 - Reality check | Document current rules/deadline; pin dependencies; Arc/Graph/Circle probes; select one viable market; confirm Privy signing path | No unverified chain/token/SDK assumption hidden in a UI |
| M1 - Financial skeleton | Privy login/wallet; unique Circle wallet assignment; actual USDC funding and return transfer; receipt reconciliation | L1-L3 and L9 on tiny testnet amounts |
| M2 - Data and policy | Live Graph snapshot/provenance; deterministic metrics; strict strategy schema; pure evaluator; signed approval | L4 plus unit tests for thresholds, decimals, signatures and reserves |
| M3 - Agentic loop | Natural-language draft; explicit approval; persistent worker; one real condition-triggered swap | L5-L8 and duplicate/restart tests |
| M4 - Product completion | Usable mobile/desktop flow; evidence drawer; explain/hold/pause; error/setup states | Browser tests and human usability review |
| M5 - Submission | Public repo, attribution, diagram, human-narrated video, short presentation, sanitized evidence | Section 22 ready report; human final check before actual deadline |
| M6 - Mainnet follow-through | Same product deployed with separately verified production capabilities | Section 20 release gates and sponsor-confirmed evidence |

Do not spend the remaining hackathon window implementing P1 rebalancing or optional x402 before M1-M3 work. If a provider dependency blocks the critical path, surface it early, finish unblocked work, and report exactly which prize proof remains missing.

## 22. Definition of done and readiness report

`bun run check:readiness` must generate a machine-readable report and a readable summary. It must distinguish `PASS`, `FAIL`, `BLOCKED`, and `NOT_RUN` for:

- P0 product flows, policy/authentication checks, and accessible mobile UI.
- All required live tests L1-L10 in section 18.
- Typecheck, lint, unit, integration, browser, and production build results on the submitted commit.
- Real Circle Agent Wallet integration, a live Graph-derived decision, and a real Privy-signed financial flow.
- Evidence files and source references, with no fabricated placeholders presented as completed proof.
- Public repository and license; fresh-build attribution and real Git history.
- AI usage/human contribution disclosure and inclusion of this spec/prompt/agent instruction file.
- Architecture diagram; working frontend/backend URLs; 2-4 minute video; short presentation; stated limitations.

A blocked provider integration cannot be upgraded to PASS because a mock test passed. Readiness for submission and readiness for mainnet are separate reports. No report guarantees an award or production security.

Evidence manifest target schema:

```json
{
  "schemaVersion": 1,
  "commit": "actual-git-commit",
  "environment": "arc-testnet",
  "generatedAt": "actual-ISO-8601-time",
  "checks": [
    {
      "id": "L5",
      "status": "NOT_RUN",
      "artifacts": [],
      "transactionHashes": [],
      "notes": "Replace only after the actual live test."
    }
  ]
}
```

Keep default status NOT_RUN in templates. Artifact paths in the final manifest must exist; receipts must resolve on the configured network. Validate hashes/addresses structurally but do not mistake structural validity for onchain proof.

## 23. Demo and submission materials

### 23.1 Demo script, approximately three minutes

**Opening:** State the problem and show the actual environment. "This is Arclet: a wallet that follows the trading rules you approve. This demonstration uses Arc Testnet."

**Funding:** Show Privy email login/embedded wallet and the real transfer into the separate trading wallet. Explain the separation in one sentence. Existing funded state can be used to save time if the actual funding receipt is shown and no claim of a new transaction is made.

**Mandate:** Enter a small supported strategy, show the interpreted threshold, reserve, turnover ceiling and market mapping, then sign. Use real data and an honestly chosen demo threshold; never claim a market movement that did not happen.

**Decision and execution:** Show the Graph source/deployment/block and the exact facts that satisfy the mandate. Let the normal worker submit through Circle. Show the confirmed Arc receipt, actual token movement, and explanation.

**Control:** Show a HOLD reason from an actual guard evaluation, then Pause. Show that no new trade is scheduled and explain that already submitted transactions still settle. Show return-transfer proof if time permits.

**Close:** Summarize each sponsor's functional role and disclose current limitations: application-operated trading wallet, proxy/cross-network signals, and testnet environment. Do not promise profits or describe this as production-safe.

Follow the event's actual video constraints and use a human voice. AI narration and sped-up videos are not allowed by the currently published guidance. Waiting can be edited out without falsifying the sequence. [R1]

### 23.2 Presentation outline

Create `docs/PRESENTATION.md` as a short presentation-ready outline:

1. User problem and one-sentence product.
2. Live flow: instruction -> signed rules -> Graph evidence -> Circle trade -> receipt.
3. Architecture diagram and wallet/control boundaries.
4. Safety model and what is not yet production-ready.
5. Sponsor evidence and mainnet follow-through plan.

A Markdown outline is part of the repository. A human may turn it into slides for submission; do not mark an uncreated slide deck as delivered. The video and presentation must describe actual implemented capabilities, not all planned P1/P2 features.

### 23.3 Sponsor write-up templates

Populate with real IDs/links after tests, not placeholder success claims.

**Circle:** Explain that a real Agent Wallet and pinned Agent Stack CLI execute the mandate's USDC swaps on Arc. Identify the signal, policy path, command adapter, and successful transactions. Describe the persistent worker and the conditional September 30 mainnet obligation.

**The Graph:** Identify the exact live Subgraph/deployment, source network and pool, queries, derived facts, and the decision that changes when Graph data changes or is unavailable. State Start Fresh. Disclose the WBTC/cirBTC proxy if used. Do not claim an Arc-native feed when the source is Ethereum.

**Privy:** Identify wallet creation/use, the user-signed funding transaction, the confirmed transfer and UX benefit. Login alone is not the financial flow. Explain why the person does not need a browser extension or raw-key handling for the personal-wallet flow.

## 24. Explicit assumptions and unresolved capabilities

These are build gates, not permission to guess.

| Item | Current evidence | Agent action |
|---|---|---|
| Submission deadline and AI rules | Official event info page checked September 12 | Recheck before submission; keep a dated requirements snapshot |
| Testnet chain/assets | Official Arc/Circle documentation | Verify chain ID, metadata, balances, and receipts on RPC |
| Actual small-size swap viability | Documented supported assets, no authenticated trade run for this spec | Probe quotes and execute a tiny user-approved live test |
| Circle CLI response schema/session persistence | Documented command families; pinned runtime not yet inspected | Record version, actual output schema and secure state location |
| Circle wallet quota | CLI documentation states five wallets per user account | Confirm available inventory; never assume unlimited users |
| Graph deployment/pool freshness | Candidate public Subgraph exists | Authenticate, inspect schema/manifest, verify source chain and real current data |
| cirBTC vs WBTC signal mapping | Distinct assets; proxy architecture chosen here | Disclose, bind mapping into approval; do not claim exact price equivalence |
| Privy Arc transaction support in the team's configuration | Privy supports configurable EVM networks | Test actual embedded-wallet signing on the selected Arc environment |
| Arc mainnet and trading support | Public launch announced for September 16; production support not exercised here | Independently verify before any mainnet enablement |
| Mainnet award condition | $2,500 conditional by September 30 | Confirm sponsor expectations/timezone; submit actual deployment evidence |
| Public real-money service | Not approved or security-audited by this specification | Keep disabled; require human custody/security/compliance review |

## 25. What the build agent must report at handoff

Report implemented versus deferred features; exact commands run and their results; live evidence versus mocked tests; environment and verified market; deployment URLs only if actually deployed; security/custody limitations; outstanding manual steps; and a precise submission-readiness verdict.

Do not finish with "production ready" because the code compiles. Do not say the prizes are guaranteed. Do not fabricate a human reviewer, consent, Git history, transaction, or mainnet deployment. The desired result is a working, demonstrable product with honest boundaries.

## 26. Primary-source register

Checked September 12, 2026. Provider docs can change. Recheck the specific API/CLI contract against the installed version and record any differences in `docs/DECISIONS.md`. Product requirements, algorithms, thresholds, repository layout and application-owned interfaces in this spec are design decisions, not sponsor-provided code.

**[R1] ETHOnline 2026 submission/rules/AI-use guidance.**
`https://ethglobal.com/events/ethonline2026/info/details`

**[R2] Arc prize requirements and September 30 condition.**
`https://ethglobal.com/events/ethonline2026/prizes/arc`

**[R3] The Graph prize requirements and Start Fresh pool.**
`https://ethglobal.com/events/ethonline2026/prizes/the-graph`

**[R4] Privy prize requirements.**
`https://ethglobal.com/events/ethonline2026/prizes/privy`

**[R5] Arc Testnet connection and chain configuration.**
`https://docs.arc.io/arc/references/connect-to-arc`

**[R6] App Kit Swap supported environments/assets.**
`https://docs.arc.io/app-kit/swap`

**[R7] cirBTC addresses and testnet asset limitations.**
`https://developers.circle.com/assets/cirbtc-contract-addresses`

**[R8] Circle Agent Wallet spending-policy scope.**
`https://developers.circle.com/agent-stack/agent-wallets/wallet-operations/custom-policies`

**[R9] Circle CLI commands, wallet quota, swap idempotency and status operations.**
`https://developers.circle.com/agent-stack/circle-cli/command-reference`

**[R10] Arc Testnet contract addresses.**
`https://docs.arc.io/arc/references/contract-addresses`

**[R11] Arc dual-interface stablecoin accounting and transfer events.**
`https://docs.arc.io/arc/concepts/stablecoin-native-model`

**[R12] Uniswap Subgraph deployment/maintenance cautions.**
`https://developers.uniswap.org/docs/ecosystem/subgraphs/overview`

**[R13] Official Uniswap v3 Subgraph schema.**
`https://github.com/Uniswap/v3-subgraph/blob/main/src/v3/schema.graphql`

**[R14] Candidate Uniswap v3 Subgraph in Graph Explorer.**
`https://thegraph.com/explorer/subgraphs/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV?chain=arbitrum-one&view=Query`

**[R15] The Graph GraphQL query API.**
`https://thegraph.com/docs/en/subgraphs/querying/graphql-api/`

**[R16] The Graph x402 payment networks and API-key alternative.**
`https://thegraph.com/docs/en/subgraphs/tooling/x402-payments/`

**[R17] Circle Agent Wallet quickstart.**
`https://developers.circle.com/agent-stack/agent-wallets/quickstart`

**[R18] Circle Agent Wallet swap behavior/minimum output.**
`https://developers.circle.com/agent-stack/agent-wallets/wallet-operations/swap`

**[R19] Privy EVM network configuration.**
`https://docs.privy.io/basics/react/advanced/configuring-evm-networks`

**[R20] Privy EVM transaction action.**
`https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction`

**[R21] Arc official public-mainnet announcement.**
`https://www.arc.io/blog/arc-mainnet-goes-live-on-september-16-2026`

**[R22] AI SDK structured output contract.**
`https://ai-sdk.dev/docs/reference/ai-sdk-core/output`

Provider construction should use the AI SDK OpenAI-compatible provider boundary when selected; pin the actual package/version during M0 rather than hard-coding a vendor-specific model SDK into domain code.

**[R23] Uniswap source token registry (verify pinned revision and chain).**
`https://raw.githubusercontent.com/Uniswap/default-token-list/main/src/tokens/mainnet.json`

**[R24] Circle Agent Stack starter kits and security/integration model.**
`https://github.com/circlefin/agent-stack-starter-kits`

**[R25] Privy React setup and quickstart.**
`https://docs.privy.io/basics/react/setup`
`https://docs.privy.io/basics/react/quickstart`

**[R26] Privy server-side token verification guidance.**
`https://docs.privy.io/recipes/dashboard/optimizing`

**[R27] Arc gas parameters (verify against runtime).**
`https://docs.arc.io/arc/references/gas-and-fees`

**[R28] Circle Agent Wallet network support.**
`https://developers.circle.com/agent-stack/agent-wallets/supported-blockchains`

End of SPEC.md.
