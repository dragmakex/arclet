# Test report

Environment: local macOS, Bun 1.3.0. Date: 2026-09-12.

| Command | Result | Scope |
|---|---|---|
| `bun install` | PASS | Exact dependencies resolved; lockfile written |
| `bun run lint` | PASS | ESLint |
| `bun run typecheck` | PASS | Strict TypeScript |
| `bun run test` | PASS | 28 offline unit assertions across 7 files |
| `bun run test:integration` | PASS | 2 environment-isolation checks |
| `bun run test:e2e` | PASS | 1 Chromium setup/custody flow test after installing the pinned browser |
| `bun run build` | PASS | Next.js production build and route generation |
| `bun run probe:arc` | PARTIAL | Chain 5042002 and USDC 6/native 18 metadata verified at block 61793731; balance scale relation and receipt still pending |
| `bun run probe:graph` | BLOCKED | Missing Graph key/source RPC |
| `bun run probe:circle` | BLOCKED | Missing pinned CLI path/session home |
| `bun run doctor` | BLOCKED (expected) | Reports ten missing provider/database settings and trading disabled |
| `bun run verify:live` | NOT_RUN | Money-moving, requires human authorization |

Offline tests are not live-provider evidence. Update this report only with actual command results.
