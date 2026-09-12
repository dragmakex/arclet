# Security model

## Trust boundaries

The user's Privy embedded wallet and Arclet's Circle trading wallet are separate. Arclet never exports the Privy key. Once funded, the Circle wallet is application-operated. Signed mandates bind exact strategy and market hashes, but cannot constrain a compromised operator outside Arclet.

## Enforced in code

- Mainnet and trading default off; conflicting environment flags fail validation.
- Strict Zod parsing at dynamic boundaries; monetary values are non-negative integer strings.
- The policy evaluator is pure, model-independent, and ordered to fail closed.
- Circle execution uses an absolute executable, argument arrays, `shell: false`, restricted environment, time/output limits, and redaction.
- Graph requests use an allowlisted HTTPS gateway, named query documents, strict envelopes, and GraphQL errors fail the read.
- API identity comes from a verified Privy bearer token, not request-body identity. Browser mutations check canonical Origin.
- Durable economic and idempotency keys are unique. UNKNOWN executions cannot transition to CANCELLED.
- Wallet mutations use PostgreSQL advisory locks; jobs use leases and fencing tokens.

## Residual risks

Application policy is not cryptographic wallet enforcement. Circle session compromise, operator actions, provider internals, approvals, unknown transaction outcomes, source-proxy basis risk, and testnet divergence remain. Public customer mainnet funding is prohibited pending separate security, custody, compliance, and recovery review.
