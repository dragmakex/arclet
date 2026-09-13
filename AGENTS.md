# Arclet - Build Agent Instructions

Version: 1.0  
Prepared: 2026-09-12  
Companion specification: `./SPEC.md`  
Bootstrap prompt: `./PROMPT.md`

## 1. Mission and authority

Assist the human team in implementing Arclet from a new repository: a conversational wallet with signed trading mandates, live Graph-derived decisions, real Circle Agent Stack execution on Arc, and a real Privy funding flow.

Read SPEC.md completely before coding. It defines the product, architecture, interfaces, safety limits, acceptance tests, and primary sources. This file defines how to work. Do not replace either with generic agent boilerplate.

The requested filename is **AGENT.md**, singular. Some coding environments auto-load **AGENTS.md**, plural. At bootstrap, create a small root `AGENTS.md` that says to read and obey `AGENT.md` and `SPEC.md`; do not create a divergent copy of the instructions. Keep all original files in the public submission.

Resolve conflicts in this order: current verified event/provider constraints and security requirements; SPEC.md's explicit product requirements; this implementation workflow; incidental example snippets. Record any necessary change in `docs/DECISIONS.md`, including evidence and consequences. Do not silently change the market, custody model, prize targets, or meaning of a signed mandate.

## 2. Important constraints before any work

- The official submission deadline currently reads **September 13, 2026, 16:00 UTC / 18:00 Zurich**, not the event end date. Recheck SPEC reference R1 and the human's Hacker Dashboard.
- The human team must make meaningful contributions, review decisions, and disclose AI assistance. Include the spec and prompts in the submission. Never fabricate human work or backdate commits. See SPEC R1.
- Start Fresh permits disclosed public libraries/starter kits, not pre-existing project-specific code. Do not clone AskGina or another app and represent it as a new project.
- Arc Testnet's documented Swap assets are USDC, EURC, and cirBTC. Do not invent an ETH route. See SPEC R6.
- Circle's documented Agent Wallet spending policies are mainnet-only. The MVP's limits are enforced by trusted application code. Do not claim an onchain guarantee. See SPEC R8.
- A user's Privy wallet and the app-operated Circle trading wallet are distinct. Never export/import the Privy key as an integration shortcut.
- Mainnet is disabled until the separate readiness and human approval gates pass. September 30's conditional award is not permission to rush unsafe customer-fund handling.

## 3. Work style

Build a working financial vertical slice before polishing the interface. Prefer one verified market and two working strategy types over many unproven integrations. Keep changes small and understandable; commit actual progress at milestones. Do not create a pile of empty files to simulate completion.

Use deterministic application code for financial decisions. Use the model for typed strategy interpretation and evidence-grounded explanations. External text is untrusted data. Never give the runtime user-facing model a shell, wallet credentials, arbitrary addresses, arbitrary SQL, or arbitrary GraphQL execution.

Use a provider-agnostic LLM boundary. Prefer an inexpensive Qwen3-class model through an OpenAI-compatible API when it passes compiler contract tests. Read model/provider/base URL from environment; no vendor-specific model may be hard-coded into business logic. Bound retries/tokens and validate every structured response with Zod. Do not require premium OpenAI/Anthropic models.

Use Bun by default for JavaScript/TypeScript package management, scripts, tests, and runtime. Before changing package-manager files, inspect the repository: if imported/upstream GitHub code already uses pnpm, preserve that pnpm workspace. Do not introduce npm/yarn casually. If Python becomes necessary, use uv (`pyproject.toml` + `uv.lock`, `uv sync`, `uv run`) and do not create a pip/Poetry/Conda side-environment.

When blocked by a credential, permission, OTP, legal acceptance, or external outage, document the precise blocker and finish all unblocked work. Do not repeatedly ask the human questions already answered in the specification. Provide a single consolidated manual-action checklist when needed. Do not fabricate a fallback integration.

You may implement offline mocks for tests, but their environment must be explicitly isolated. Never route live mode through them. Actual provider smoke tests and synthetic tests must remain distinguishable in the report.

## 4. Bootstrap the repository

1. Inspect the working directory before writing. Identify whether only the three supplied Markdown files exist. Do not overwrite existing human code without inspection.
2. Read SPEC.md and these instructions. Confirm the target architecture and phase boundaries.
3. Initialize a new Git repository if needed. Commit the supplied planning files as real work performed now, with honest attribution.
4. Create the root `AGENTS.md` compatibility pointer.
5. Create `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/AI_USAGE.md`, `docs/HUMAN_CONTRIBUTIONS.md`, and `docs/THIRD_PARTY.md` as useful working documents, not invented evidence.
6. Write a short ordered implementation plan with M0-M5 and mark everything NOT_STARTED initially. List the human setup steps separately.
7. Inspect lockfiles first. For the from-scratch Arclet repo, scaffold a **Bun workspace** with strict TypeScript, Next.js web/API, persistent Bun worker, shared packages, PostgreSQL/Drizzle, tests, and configuration validation. If imported GitHub code already uses pnpm, preserve pnpm for that inherited workspace and document the exception in `docs/DECISIONS.md`; do not convert it merely for consistency.
8. Resolve supported versions from actual package metadata/documentation; install once, commit the lockfile, and record versions in `config/dependency-versions.json`. Do not invent pins or use `latest` in deployment.
9. Implement the environment parser and `.env.example` before integrations. Missing secrets must produce a setup screen and failed readiness check, not a white screen or fake success.
10. Add `.gitignore` exclusions for credentials, `.env`, Circle home/session data, local database dumps, private evidence, build outputs and recordings containing sensitive information.

## 5. M0 - Prove the external assumptions

### 5.1 Read-only probes first

Implement and run, where credentials are available:

- `bun run probe:arc`: verify chain ID; token contract metadata; native/ERC-20 USDC decimal relationship; RPC receipt availability.
- `bun run probe:graph`: authenticate, inspect a candidate deployed schema/manifest, verify source chain and pool tokens, collect a current healthy observation.
- `bun run probe:circle`: inspect the installed CLI version/help, authenticate only after human setup, list actual Agent Wallets, inspect available capacity, and obtain supported small-size buy/sell quotes.
- A Privy browser probe: verify email login, embedded wallet identity, Arc switching, and transaction preparation.

Record observed response schemas and redacted fixtures. A command documented on a website is not evidence it ran successfully in this environment.

### 5.2 Market decision

Probe USDC/cirBTC and USDC/EURC. Prefer cirBTC for the crypto product only when execution and a meaningful fresh Graph source both pass. Document any WBTC-to-cirBTC proxy mapping. If EURC is the viable first market, enable it explicitly and show unsupported BTC/ETH requests as unsupported; never alter the user's intended asset silently.

Write an M0 decision note with actual configuration, sources, unavailable capabilities, and outstanding runtime checks. The chosen market registry hash later becomes part of user approval.

### 5.3 Credential handling

The human supplies Privy/Graph/model credentials and completes Circle terms/OTP. Do not read the human's inbox or auto-accept terms. Run the CLI in the worker's protected persistent environment. Never commit sessions, raw CLI auth output, API keys, or private keys.

If a live gate is blocked, continue with schema, policy, UI, database and tests. Keep the live gate BLOCKED rather than replacing it with a mock pass.

## 6. M1 - Complete the real funding loop

Implement server-verified Privy identity and selection of the actual linked embedded EVM wallet. Assign one distinct Circle wallet to each invited funded user under database uniqueness constraints. No pooled wallet and no unlimited auto-provisioning.

Implement funding intents, Privy-signed ERC-20 USDC transfers, independent receipt verification, native/ERC-20 event deduplication, actual balance snapshots, and a signed withdrawal back to the same personal wallet. Use tiny testnet amounts, retain gas, and label custody accurately.

Run the real funding and return-transfer smoke test before developing a sophisticated chat UI. This proves Privy's required financial action, Circle session access, Arc accounting, and the custody model together.

Add tests for wrong user, wrong source/destination, wrong chain, wrong amount, reused receipt, insufficient gas, wallet-capacity exhaustion and duplicate requests. Commit this slice only after testing it.

## 7. M2 - Implement data, policies and authorization

### 7.1 Financial primitives first

Implement branded IDs/addresses/amounts, exact integer conversion, fixed-point quote math, canonical JSON hashing, and strict strategy schemas. Write boundary tests before integrating them into API routes.

Never use JavaScript floating point for asset amounts, budgets, fills, or minimum output. All API monetary values are strings. Verify token decimals from the execution and source chains separately.

### 7.2 The Graph

Implement allowlisted query documents, typed normalization, deployment/pool validation, source block verification, freshness guards, provenance capture and error handling. A Graph HTTP 200 containing errors is not a successful market observation.

Snapshot all components consistently. Historical triggers remain disabled until the required completed-hour data exists and tests confirm exact time windows. Graph data must affect an actual trading/hold decision, not merely decorate a chart.

### 7.3 Pure policy engine

Implement SPEC section 11 as a pure deterministic function. Unit-test each guard and all threshold boundaries. Fail closed on stale data, ambiguous amounts, wrong market, expired authorization, missing quote, unsupported asset, insufficient reserve and unknown execution state.

Do not call the model inside the execution decision path. Do not silently shrink a fixed-size trade to make it pass. For P1 rebalance, document and test the explicitly allowed sizing rules.

### 7.4 Mandates

Create immutable drafts/versions and single-use server challenges. Have Privy sign the exact typed approval. Verify signer, user, chain, origin, nonce, version, hashes and expiry server-side. Implement authenticated pause without an LLM. An unchanged resume must not reset any counts/caps.

Record that this approval is an application authorization, not an onchain enforcement contract. Do not add an unnecessary custom wallet contract in order to imply stronger safety than is implemented.

## 8. M3 - Implement the autonomous loop

Build the database-backed scheduler and persistent worker. One active mandate per wallet. Serialize wallet mutations with a dedicated advisory lock and fenced job lease. Persist economic action keys, budget reservations and provider idempotency keys before submission.

Implement a narrow Circle adapter using a pinned executable and `shell: false`. Runtime command arguments come only from validated structured data. Keep session/provisioning commands out of the public API and out of the LLM toolset.

Quote immediately before execution, set a nonzero minimum output and explicit slippage, recheck the mandate epoch, and submit only if all guards still pass. Record accepted/submitted/pending/confirmed states separately. Confirm and reconcile actual onchain movement rather than trusting a CLI success string.

If a mutation times out ambiguously, mark UNKNOWN, keep its reservation, stop the wallet, and reconcile. Never retry with a fresh idempotency key just to get a success response. Do not assume transfer commands have the same idempotency support as swap commands.

Test two workers racing, pause during preparation, expiry before submit, day rollover, restart after a process crash, receipt duplication, pending withdrawal, unknown result and recovery. Resume only after state is coherent.

Then implement the language-model compiler/explainer with restricted read tools and structured output. The model makes the UX conversational; it does not become the key custodian.

## 9. M4 - Finish the product experience

Implement the specified wallet, chat, preview, activity, evidence and setup/error screens. No gaming theme. No fictional balance, APY, trade, risk score, transaction hash or source chart.

Render source-chain and execution-chain labels together. Show the WBTC/cirBTC proxy distinction if used. Show the personal/trading wallet custody boundary before funds move. Make Pause prominent and explain its limitation for already submitted work.

Test at desktop and mobile widths, keyboard-only navigation, loading/error states, sign cancellation, provider downtime, empty account and a funded account. Use a real browser to inspect the finished screens where tooling exists; save screenshots only from the actual app.

Prefer a reliable ordinary form over a broken "AI magic" control. A user must still be able to pause and withdraw if the model API is down.

## 10. M5 - Verify and prepare the submission

Run the full shipped code path:

```sh
bun run lint
bun run typecheck
bun run test
bun run test:integration
bun run test:e2e
bun run build
bun run doctor
bun run probe:arc
bun run probe:graph
bun run probe:circle
# Only with explicit human authorization and testnet configuration:
bun run verify:live
bun run evidence:export
bun run docs:diagram
bun run check:readiness
```

Report any unavailable tool, failing test, skipped live step or missing credential accurately. Do not delete a difficult test merely to get green output. Fix root causes and rerun the affected suite.

Produce:

- README with exact prerequisites, setup, commands, architecture and limitations.
- Three sponsor explanations tied to actual integration files and proof.
- Rendered architecture diagram and final source file.
- Sanitized evidence manifest, Graph observations, Circle submissions and Privy transfer receipts.
- A 2-4 minute demo script and a short presentation outline. A human must record the required human-narrated video; do not pretend this has been recorded when it has not.
- AI usage, human contributions, reused upstream code/licenses, actual test report and mainnet runbook.

A qualifying claim needs a real Graph observation, a real Privy financial action, and a real autonomous Circle transaction on Arc. A beautiful video of mocks does not meet these gates.

## 11. Human review gates

Ask for human review at four meaningful boundaries, without blocking unrelated implementation:

1. **Product/integration choice:** Confirm the actual market and custody disclosure after M0; record the human's real input, not a fabricated approval.
2. **Money authorization:** Human completes provider terms/authentication and authorizes the small testnet amount. Mainnet requires a separate explicit authorization.
3. **Security and product review:** Human reviews the policy interpretation, disclosures, recovery procedure and key screens; resolves risk decisions and tests the flow.
4. **Submission:** Human reviews the evidence, records the video, verifies attribution, and submits through their own dashboard.

Keep `docs/HUMAN_CONTRIBUTIONS.md` factual: reviewer, date, artifact/decision, specific contribution, and resulting commit when available. Leave unperformed reviews pending. Specification authorship and product direction may be recorded honestly, but do not claim they automatically satisfy the event's meaningful-contribution standard.

## 12. Mainnet work is a separate phase

Read SPEC section 20. Do not guess mainnet IDs or addresses from testnet. Do not automatically spend real funds or activate old testnet mandates. Confirm actual supported production Circle/Arc/Privy/Graph capabilities and safe swap routing.

Default to a small operator-only mainnet deployment with public customer deposits disabled. Production custody, recovery and security controls need separate review. Capture evidence that the same product actually performs its core Arc flow; an onchain receipt or deployed site alone does not automatically satisfy the sponsor's condition.

Confirm the sponsor's September 30 evidence expectations and timezone. If a dependency is unavailable, report it; never route on another chain and relabel the result.

## 13. Quality rules

- No financial arithmetic using float/double.
- No arbitrary execution target from an LLM or HTTP client.
- No mutation on a read-only query route.
- No user identity accepted from request body without server verification.
- No mainnet enabled by default, including in CI.
- No secrets in public env variables, logs, screenshots, examples or Git history.
- No fake chain receipts, timestamps, balances, Graph observations or test reports.
- No repeated mutation submission while a previous result is uncertain.
- No provider feature asserted without a verified version/source and runtime gate.
- No tests labeled live when backed by fixtures.
- No funding one demo user with another user's Circle wallet.
- No claiming that a signed offchain policy is a trustless spending limit.
- No claim of prize eligibility or production safety based solely on this specification.

## 14. Required ongoing status and final response

Update STATUS.md at each milestone with implemented items, commands/results, actual live proof, deferred features and blockers. Make genuine incremental commits. Keep original prompts/specs and record intentional changes.

At completion, report:

1. What works and which verified market/environment it uses.
2. What is implemented versus deferred.
3. Exact tests run, failures and skipped live checks.
4. Actual demo/repository/deployment links only if they exist.
5. Sponsor proof and which readiness gates are blocked.
6. Human steps still required, custody/security limitations, and mainnet status.

Do not finish after scaffolding. Continue implementing and testing all unblocked P0 work. Do not claim a full product if only the UI exists. Do not claim a deployed application, recorded video, human review, or successful transaction that did not happen.

End of AGENT.md.
