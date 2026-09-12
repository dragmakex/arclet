import { ARC_USDC, createArcClient, erc20Abi } from "@arclet/chain";
import { currentObservationAges } from "@arclet/graph";
import { addressSchema, atomic, strategySpecSchema } from "@arclet/domain";
import { evaluatePolicy, nextEvaluationAt, type ApprovedMarket, type ExecutionQuote, type MarketObservation } from "@arclet/policy";
import type { CircleTradingAdapter } from "@arclet/circle";
import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";
import chain from "../../../config/chains/arc-testnet.json";
import registry from "../../../config/markets.json";
import { runtimeSafetyLimits } from "../../../config/runtime";

const marketSchema = z.object({
  id: z.enum(["usdc-cirbtc", "usdc-eurc"]), enabled: z.literal(true), marketConfigHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  sourceChainId: z.number().int(), deployment: z.string().min(1), pool: z.string(), outputAsset: z.enum(["EURC", "cirBTC"]), outputDecimals: z.number().int().min(0).max(36)
}).passthrough();
const metricSchema = z.object({
  marketId: z.enum(["usdc-cirbtc", "usdc-eurc"]), healthy: z.boolean(), indexingErrors: z.boolean(), sourceChainId: z.number(), deployment: z.string(), pool: z.string(),
  sourceBlockTime: z.number().int(), latestSwapAt: z.number().int(), sourceTvlUsdAtomic: z.string(), referencePriceUsdcAtomic: z.string()
});
type Job = { id: string; payload: unknown; fencing_token: string; lease_owner: string };
type Queryable = Sql<Record<string, never>> | TransactionSql<Record<string, never>>;
type StrategyRow = { id: string; state: string; current_version: number; authorization_epoch: string; canonical_spec: unknown; spec_hash: string; market_config_hash: string; wallet_id: string; wallet_address: string };

export async function evaluateJob(sql: Sql<Record<string, never>>, job: Job, adapter: CircleTradingAdapter) {
  const payload = z.object({ strategyId: z.string().uuid() }).parse(job.payload);
  const now = Math.floor(Date.now() / 1000);
  const rows = await sql<StrategyRow[]>`SELECT s.id,s.state,s.current_version,s.authorization_epoch::text,v.canonical_spec,v.spec_hash,v.market_config_hash,w.id AS wallet_id,w.address AS wallet_address FROM strategies s JOIN strategy_versions v ON v.strategy_id=s.id AND v.version=s.current_version JOIN trading_wallets w ON w.id=s.trading_wallet_id WHERE s.id=${payload.strategyId}`;
  const row = rows[0];
  if (!row) return finish(sql, job);
  const strategy = strategySpecSchema.parse(row.canonical_spec);
  const configured = registry.markets.find((item) => item.id === strategy.marketId);
  const marketResult = marketSchema.safeParse(configured);
  if (!marketResult.success) return holdAndSchedule(sql, job, row, strategy, now, null, "UNSUPPORTED_MARKET", "Market has not passed M0 verification");
  const marketConfig = marketResult.data;
  if (marketConfig.marketConfigHash !== strategy.marketConfigHash) return holdAndSchedule(sql, job, row, strategy, now, null, "CONFIG_CHANGED", "Market hash changed after approval");

  const walletAddress = addressSchema.parse(row.wallet_address);
  const client = createArcClient(process.env.ARC_RPC_URL);
  const outputToken = chain.tokens[marketConfig.outputAsset].address as `0x${string}`;
  const [block, native, usdcBalance, assetBalance] = await Promise.all([
    client.getBlock(), client.getBalance({ address: walletAddress }),
    client.readContract({ address: ARC_USDC, abi: erc20Abi, functionName: "balanceOf", args: [walletAddress] }),
    client.readContract({ address: outputToken, abi: erc20Abi, functionName: "balanceOf", args: [walletAddress] })
  ]);
  if (native / 1_000_000_000_000n !== usdcBalance) return holdAndSchedule(sql, job, row, strategy, now, null, "PENDING_RECONCILIATION", "Arc native/ERC-20 USDC views disagree");
  await sql`INSERT INTO wallet_snapshots (wallet_id,block_number,block_hash,observed_at,native_usdc_atomic18,erc20_balances,token_metadata_version,reconciliation_state) VALUES (${row.wallet_id},${block.number.toString()},${block.hash},to_timestamp(${block.timestamp.toString()}),${native.toString()},${sql.json({ USDC: usdcBalance.toString(), [marketConfig.outputAsset]: assetBalance.toString() })},'arc-testnet-v1','coherent')`;

  const [observationRows, snapshotRows] = await Promise.all([
    sql<[{ id: string; normalized_metrics: unknown; quality_verdict: string }]>`SELECT id,normalized_metrics,quality_verdict FROM market_observations WHERE normalized_metrics->>'marketId'=${strategy.marketId} ORDER BY created_at DESC LIMIT 1`,
    sql<[{ erc20_balances: Record<string, string> }]>`SELECT erc20_balances FROM wallet_snapshots WHERE wallet_id=${row.wallet_id} AND reconciliation_state='coherent' ORDER BY observed_at DESC LIMIT 1`
  ]);
  const observationRow = observationRows[0], snapshot = snapshotRows[0];
  if (!observationRow || !snapshot) return holdAndSchedule(sql, job, row, strategy, now, observationRow?.id ?? null, "DATA_STALE", "Validated observation or coherent wallet snapshot is missing");
  const metric = metricSchema.parse(observationRow.normalized_metrics);
  const { sourceBlockAgeSeconds, lastSwapAgeSeconds } = currentObservationAges(metric.sourceBlockTime, metric.latestSwapAt, now);
  const wallet = walletAddress;
  const approvedMarket: ApprovedMarket = { marketId: strategy.marketId, sourceChainId: marketConfig.sourceChainId, deployment: marketConfig.deployment, pool: addressSchema.parse(marketConfig.pool), executionChainId: 5042002, tradingWallet: wallet, inputAsset: "USDC", outputAsset: marketConfig.outputAsset };
  const quote = await adapter.quote({ marketId: strategy.marketId, chain: "ARC-TESTNET", chainId: 5042002, wallet, inputAsset: "USDC", outputAsset: marketConfig.outputAsset, inputAtomic: strategy.amountInAtomic, inputDecimals: 6, outputDecimals: marketConfig.outputDecimals });
  const assetAtomic = snapshot.erc20_balances[marketConfig.outputAsset] ?? "0";
  const assetValue = BigInt(assetAtomic) > 0n ? (await adapter.quote({ marketId: strategy.marketId, chain: "ARC-TESTNET", chainId: 5042002, wallet, inputAsset: marketConfig.outputAsset, outputAsset: "USDC", inputAtomic: atomic(assetAtomic), inputDecimals: marketConfig.outputDecimals, outputDecimals: 6 })).outputAtomic : "0";
  const usdc = snapshot.erc20_balances.USDC ?? "0";
  const total = BigInt(usdc) + BigInt(assetValue);
  const prospective = total > 0n ? Number((BigInt(assetValue) + BigInt(strategy.amountInAtomic)) * 10_000n / total) : null;
  const [usage, count, pending, pendingWithdrawal, authorization, keys] = await Promise.all([
    sql<[{ total: string }]>`SELECT COALESCE(sum(confirmed_principal_turnover_atomic::numeric),0)::text AS total FROM daily_usage WHERE wallet_id=${row.wallet_id} AND utc_day=${new Date(now * 1000).toISOString().slice(0, 10)}`,
    sql<[{ count: string; last: string | null }]>`SELECT count(*)::text AS count,max(created_at)::text AS last FROM executions WHERE wallet_id=${row.wallet_id} AND state='CONFIRMED'`,
    sql<[{ count: string; reserved: string }]>`SELECT count(*) FILTER (WHERE e.state IN ('SUBMITTING','SUBMITTED','UNKNOWN'))::text AS count,COALESCE(sum(r.reserved_notional_atomic::numeric) FILTER (WHERE r.state='reserved'),0)::text AS reserved FROM executions e LEFT JOIN budget_reservations r ON r.execution_id=e.id WHERE e.wallet_id=${row.wallet_id}`,
    sql<[{ count: string }]>`SELECT count(*)::text AS count FROM withdrawals WHERE wallet_id=${row.wallet_id} AND state NOT IN ('CONFIRMED','FAILED','CANCELLED')`,
    sql<[{ exists: boolean }]>`SELECT EXISTS(SELECT 1 FROM authorizations WHERE user_id=(SELECT user_id FROM strategies WHERE id=${row.id}) AND purpose='mandate' AND consumed_at IS NOT NULL AND revoked_at IS NULL AND mandate_expires_at>now() AND typed_message->>'strategyHash'=${row.spec_hash}) AS exists`,
    sql<{ economic_action_key: string }[]>`SELECT economic_action_key FROM executions WHERE economic_action_key LIKE ${`${row.id}:${row.current_version}:schedule:%`}`
  ]);
  const observation: MarketObservation = {
    healthy: metric.healthy && observationRow.quality_verdict === "HEALTHY", indexingErrors: metric.indexingErrors, sourceChainId: metric.sourceChainId, deployment: metric.deployment,
    pool: addressSchema.parse(metric.pool), sourceBlockAgeSeconds, lastSwapAgeSeconds, sourceTvlUsdAtomic: atomic(metric.sourceTvlUsdAtomic), referencePriceUsdcAtomic: atomic(metric.referencePriceUsdcAtomic), marketConfigHash: strategy.marketConfigHash, marketId: metric.marketId
  };
  const executionQuote: ExecutionQuote = { marketId: strategy.marketId, chainId: 5042002, wallet, inputAsset: "USDC", outputAsset: marketConfig.outputAsset, inputAtomic: quote.inputAtomic, outputAtomic: quote.outputAtomic, outputDecimals: quote.outputDecimals, createdAt: quote.createdAt, ...(quote.expiresAt ? { expiresAt: quote.expiresAt } : {}), ...(quote.providerReference ? { providerReference: quote.providerReference } : {}) };
  const result = evaluatePolicy({
    strategy, now, environment: "arc-testnet", tradingEnabled: process.env.TRADING_ENABLED === "true", globalKillSwitch: process.env.TRADING_ENABLED !== "true", applicationLimits: runtimeSafetyLimits(), approvedMarket,
    strategyState: row.state === "ACTIVE" ? "ACTIVE" : "PAUSED", signatureValid: Boolean(authorization[0]?.exists), authorizationEpochCurrent: true, providerHealthy: (await adapter.health()).healthy,
    unresolvedAction: Number(pending[0]!.count) > 0 || Number(pendingWithdrawal[0]!.count) > 0, observation, usdcBalanceAtomic: atomic(usdc), pendingOutflowAtomic: atomic(pending[0]!.reserved), gasBufferAtomic: atomic("100000"),
    dailyTurnoverAtomic: atomic(usage[0]!.total), prospectiveAssetAllocationBps: prospective, executionCount: Number(count[0]!.count), ...(count[0]!.last ? { lastExecutionAt: Math.floor(new Date(count[0]!.last).getTime() / 1000) } : {}),
    executedScheduleKeys: new Set(keys.map((item) => item.economic_action_key.split(":schedule:")[1]!).filter(Boolean)), quote: executionQuote
  });
  if (result.decision === "HOLD") return holdAndSchedule(sql, job, row, strategy, now, observationRow.id, result.code, result.checks.at(-1)?.fact ?? result.code);

  const actionPart = result.action.scheduleKey ? `schedule:${result.action.scheduleKey}` : `condition:${Number(count[0]!.count)}`;
  const economicKey = `${row.id}:${row.current_version}:${actionPart}`;
  const idempotencyKey = crypto.randomUUID();
  await sql.begin(async (tx) => {
    const decision = await tx<[{ id: string }]>`INSERT INTO decisions (strategy_id,observation_id,evaluator_version,result,reasons,proposed_action) VALUES (${row.id},${observationRow.id},'policy-v1','EXECUTE',${tx.json(result.checks)},${tx.json(result.action)}) RETURNING id`;
    const execution = await tx<[{ id: string }]>`INSERT INTO executions (decision_id,wallet_id,authorization_epoch,state,economic_action_key,provider_idempotency_key,quote) VALUES (${decision[0]!.id},${row.wallet_id},${row.authorization_epoch},'RESERVED',${economicKey},${idempotencyKey},${tx.json(quote)}) ON CONFLICT (economic_action_key) DO NOTHING RETURNING id`;
    if (execution[0]) {
      await tx`INSERT INTO budget_reservations (wallet_id,execution_id,utc_day,reserved_notional_atomic) VALUES (${row.wallet_id},${execution[0].id},${new Date(now * 1000).toISOString().slice(0, 10)},${strategy.amountInAtomic})`;
      await tx`INSERT INTO jobs (type,payload,dedupe_key,scheduled_at) VALUES ('SUBMIT',${tx.json({ executionId: execution[0].id })},${`submit:${execution[0].id}`},now())`;
    }
    await scheduleNextEvaluation(tx, row, strategy, now);
    await finish(tx, job);
  });
}

async function holdAndSchedule(sql: Sql<Record<string, never>>,  job: Job, row: StrategyRow, strategy: z.infer<typeof strategySpecSchema>, now: number, observationId: string | null, code: string, fact: string) {
  await sql.begin(async (tx) => {
    await recordHold(tx, row.id, observationId, code, fact);
    if (row.state === "ACTIVE") await scheduleNextEvaluation(tx, row, strategy, now);
    await finish(tx, job);
  });
}

async function scheduleNextEvaluation(sql: Queryable, row: StrategyRow, strategy: z.infer<typeof strategySpecSchema>, now: number) {
  const scheduledAt = nextEvaluationAt(strategy, now);
  await sql`UPDATE strategies SET next_evaluation_at=to_timestamp(${scheduledAt}) WHERE id=${row.id} AND state='ACTIVE'`;
  await sql`INSERT INTO jobs (type,payload,dedupe_key,scheduled_at) VALUES ('EVALUATE',${sql.json({ strategyId: row.id })},${`evaluate:${row.id}:${row.current_version}:${row.authorization_epoch}:${scheduledAt}`},to_timestamp(${scheduledAt})) ON CONFLICT (dedupe_key) DO NOTHING`;
}
async function recordHold(sql: Queryable, strategyId: string, observationId: string | null, code: string, fact: string) { await sql`INSERT INTO decisions (strategy_id,observation_id,evaluator_version,result,reasons) VALUES (${strategyId},${observationId},'policy-v1','HOLD',${sql.json([{ code, passed: false, fact }])})`; }
async function finish(sql: Queryable, job: Job) { await sql`UPDATE jobs SET terminal=true WHERE id=${job.id} AND fencing_token=${job.fencing_token} AND lease_owner=${job.lease_owner}`; }
