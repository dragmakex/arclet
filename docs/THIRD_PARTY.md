# Third-party software

No project-specific upstream application was imported. Dependencies are installed from the Bun registry lockfile. Exact versions are in `config/dependency-versions.json`.

Primary runtime dependencies: Next.js/React, Privy React and server auth SDKs, viem, Drizzle/Postgres.js, Zod, Decimal.js, Vercel AI SDK and its OpenAI-compatible adapter. Test/build dependencies include Vitest, Playwright, ESLint, TypeScript, and Mermaid CLI. Review package licenses from the lockfile before public submission.

The production worker image installs the published `@circle-fin/cli` 1.0.0 package under Node 22.14.0. Its complete npm dependency tree is locked in `ops/circle-cli/package-lock.json`; no Circle credentials or session files are vendored. The production edge uses Caddy 2.10.2 and PostgreSQL 17.6 images.
