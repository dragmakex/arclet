# Test report

Environment: local macOS, Bun 1.3.0. Date: 2026-09-12.

| Command | Result | Scope |
|---|---|---|
| `bun install` | PASS | Exact dependencies resolved; lockfile written |
| `bun run lint` | PASS | ESLint |
| `bun run typecheck` | PASS | Strict TypeScript |
| `bun run test` | PASS | 53 offline unit assertions across 13 files, including signature/origin binding, funding-sender binding, recurring scheduling, decision-time Graph freshness, pause/lease fencing, withdrawal gas-buffer guards, and exact desk amount/chart/data normalization |
| `bun run test:integration` | PASS | 2 environment-isolation checks; PostgreSQL integration remains BLOCKED without a database |
| `DATABASE_URL=postgresql://arclet:arclet@localhost:5432/arclet bun run db:generate` | PASS | Generated checked-in execution authorization/payload/provider-reference migration |
| `bun run db:migrate` | BLOCKED | DATABASE_URL was not configured; no migration was applied |
| `bun run test:e2e` | PASS | 2 Chromium unconfigured-desk tests: root forwards to the desk, empty ledger/chart remain explicit, unavailable actions stay disabled, keyboard focus works, and the 390px layout has no horizontal overflow |
| `bun run build` | PASS | Next.js production build and route generation, including authenticated desk/activity evidence routes |
| `bun run probe:arc` | PARTIAL | Chain 5042002 and USDC 6/native 18 metadata reverified at block 61801046; balance scale relation and receipt still pending |
| `bun run probe:graph` | BLOCKED | Missing Graph key/source RPC/deployment/pool configuration |
| `bun run probe:circle` | BLOCKED | Missing pinned CLI path/session home |
| `bun run doctor` | BLOCKED (expected) | Reports missing database/provider settings and trading disabled |
| `bun run check:readiness` | BLOCKED (expected) | No provider configuration, live evidence, or current automated-test evidence manifest |
| repository secret-pattern scan | PASS | No common private-key, AWS key, or API-key patterns found in tracked source |
| `bun run verify:live` | NOT_RUN | Money-moving, requires human authorization |

Offline tests are not live-provider evidence. Authenticated draft/sign, Privy funding, withdrawal signature, provider-error, and receipt-link browser paths remain blocked until a real Privy test configuration and PostgreSQL environment are supplied; no mock-auth bypass is included in the testnet bundle. Update this report only with actual command results.
