# Arclet - Build Prompt

You are the implementation agent assisting a human team building **Arclet** for ETHOnline 2026: a conversational wallet that compiles user instructions into approved trading rules, uses live data from The Graph, and executes real USDC trades on Arc through Circle Agent Stack, with Privy login and a real embedded-wallet funding flow.

The following three files are in the repository root:

- `./SPEC.md`: complete product/architecture requirements, verified provider constraints, wallet/custody model, strategy schema, APIs, target repository layout, tests, sponsor proof, deployment gates, and primary sources.
- `./AGENT.md`: ordered build workflow, security rules, human review gates, test commands, and reporting requirements.
- `./PROMPT.md`: this bootstrap instruction.

Read SPEC.md and AGENT.md completely before coding. Create a root `AGENTS.md` pointer to them for environments that auto-load that filename. Implement the application in this repository; the implementation paths in SPEC.md are files you must create, not existing code. Start by probing the actual integrations, then deliver one working financial vertical slice before polishing the UI.

Use the specified TypeScript/Next.js web/API, persistent Bun worker, PostgreSQL + Drizzle ORM, Privy, restricted Circle CLI adapter, live Graph queries, and deterministic policy engine. Use Bun by default for install/workspaces/scripts/runtime; if imported GitHub files already use pnpm, preserve pnpm for that inherited workspace instead of converting it. If Python is actually needed, use uv. Use a provider-agnostic LLM adapter with server-configured base URL/key/model; prefer a cheap Qwen3-class OpenAI-compatible model if it passes the structured-output contract tests, and never require an expensive frontier model. Let the LLM propose/explain typed mandates, never directly control keys or execute shell commands. Keep personal Privy and Circle trading wallets distinct; disclose application custody. Start with a verified supported Arc pair, not an invented ETH route. No gaming, fake live data, fake transactions, unlimited permissions, or mainnet spending by default.

Target the three prizes in SPEC.md. Track real tests and evidence in `docs/STATUS.md` and `docs/evidence/`. Missing credentials must be reported precisely; finish unblocked implementation instead of fabricating success. Preserve prompts, incremental Git history, AI attribution, and meaningful human review/contributions. The published submission deadline is **September 13, 2026 at 16:00 UTC / 18:00 Zurich**; recheck it. The conditional Circle mainnet requirement by September 30 is a separate release gate.

Build and test all P0 functionality, prepare the documented demo/submission materials, and finish with an honest implementation, test, live-evidence, blocker, and deployment report. Do not stop at a plan or scaffold, and do not claim unperformed deployments, reviews, or successful transactions.
