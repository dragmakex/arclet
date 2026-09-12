# Mainnet runbook

Mainnet is disabled. Before any transaction: verify official Arc chain/RPC/explorer and token addresses; verify Circle Agent Wallet mainnet support, session separation, quote/submit/reconcile behavior and provider controls; verify real pair liquidity and minimum-output enforcement; provision separate secrets/database/origin; require new signatures; complete threat-model, dependency, secret, custody/compliance and recovery reviews; pin a reviewed commit; obtain explicit human amount approval; run only tiny operator-owned transactions; retain public customer deposits disabled; export real receipts without secrets; confirm sponsor evidence channel and cutoff timezone.

`bun run check:mainnet` must remain nonzero until every gate is independently implemented and evidenced.
