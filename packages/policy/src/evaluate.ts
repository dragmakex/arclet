import type { Address, Atomic, Hash, StrategySafetyLimits, StrategySpec } from "@arclet/domain";
import { atomic, minimumOutput, validateStrategySafety } from "@arclet/domain";

export type HoldCode = "PAUSED" | "EXPIRED" | "WRONG_ENVIRONMENT" | "CONFIG_CHANGED" | "UNAUTHORIZED" | "SESSION_UNAVAILABLE" | "DATA_STALE" | "INDEXING_ERROR" | "TRIGGER_NOT_MET" | "NOT_DUE" | "COOLDOWN" | "EXECUTION_COUNT" | "INSUFFICIENT_BALANCE" | "RESERVE_VIOLATION" | "DAILY_LIMIT" | "TRADE_LIMIT" | "ALLOCATION_LIMIT" | "QUOTE_UNAVAILABLE" | "QUOTE_EXPIRED" | "UNSUPPORTED_MARKET" | "PENDING_RECONCILIATION" | "INVALID_MIN_OUT" | "GLOBAL_KILL_SWITCH";
export type Check = { code: HoldCode | "OK"; passed: boolean; fact: string };
export type ApprovedMarket = { marketId: StrategySpec["marketId"]; sourceChainId: number; deployment: string; pool: Address; executionChainId: 5042002; tradingWallet: Address; inputAsset: "USDC"; outputAsset: "EURC" | "cirBTC" };
export type MarketObservation = { healthy: boolean; indexingErrors: boolean; sourceChainId: number; deployment: string; pool: Address; sourceBlockAgeSeconds: number; lastSwapAgeSeconds: number; sourceTvlUsdAtomic: Atomic; referencePriceUsdcAtomic: Atomic; marketConfigHash: Hash; marketId: StrategySpec["marketId"] };
export type ExecutionQuote = { marketId: StrategySpec["marketId"]; chainId: 5042002; wallet: Address; inputAsset: "USDC"; outputAsset: "EURC" | "cirBTC"; inputAtomic: Atomic; outputAtomic: Atomic; outputDecimals: number; createdAt: number; expiresAt?: number; providerReference?: string };
export type PolicyInput = {
  strategy: StrategySpec; now: number; environment: "arc-testnet" | "arc-mainnet"; tradingEnabled: boolean; globalKillSwitch: boolean;
  applicationLimits: StrategySafetyLimits; approvedMarket: ApprovedMarket;
  strategyState: "ACTIVE" | "PAUSED"; signatureValid: boolean; authorizationEpochCurrent: boolean; providerHealthy: boolean; unresolvedAction: boolean;
  observation: MarketObservation | null; usdcBalanceAtomic: Atomic; pendingOutflowAtomic: Atomic; gasBufferAtomic: Atomic; dailyTurnoverAtomic: Atomic;
  prospectiveAssetAllocationBps: number | null; executionCount: number; lastExecutionAt?: number; executedScheduleKeys: ReadonlySet<string>; quote: ExecutionQuote | null;
};
export type PolicyResult = { decision: "HOLD"; code: HoldCode; checks: Check[] } | { decision: "EXECUTE"; checks: Check[]; action: { amountInAtomic: Atomic; minimumOutputAtomic: Atomic; scheduleKey?: string } };

function hold(code: HoldCode, checks: Check[], fact: string): PolicyResult { return { decision: "HOLD", code, checks: [...checks, { code, passed: false, fact }] }; }
function scheduleKey(start: number, every: number, now: number): string | null { return now < start ? null : `${start}:${every}:${Math.floor((now - start) / every)}`; }
function sameQuote(quote: ExecutionQuote, market: ApprovedMarket, amount: Atomic): boolean {
  return quote.marketId === market.marketId && quote.chainId === market.executionChainId && quote.wallet === market.tradingWallet && quote.inputAsset === market.inputAsset && quote.outputAsset === market.outputAsset && quote.inputAtomic === amount;
}
function sameObservation(observation: MarketObservation, market: ApprovedMarket, strategy: StrategySpec): boolean {
  return observation.marketId === market.marketId && observation.sourceChainId === market.sourceChainId && observation.deployment === market.deployment && observation.pool === market.pool && observation.marketConfigHash === strategy.marketConfigHash;
}

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const checks: Check[] = [];
  if (input.globalKillSwitch) return hold("GLOBAL_KILL_SWITCH", checks, "Global trading kill switch is active");
  if (!input.tradingEnabled || input.environment !== "arc-testnet") return hold("WRONG_ENVIRONMENT", checks, "Autonomous execution is allowed only on explicitly enabled Arc Testnet");
  if (input.strategy.side !== "buy" || input.strategy.mode !== "auto_within_limits") return hold("UNSUPPORTED_MARKET", checks, "Only automatic fixed-input buys are enabled in P0");
  try { validateStrategySafety(input.strategy, input.now, input.applicationLimits); } catch (error) { return hold("TRADE_LIMIT", checks, error instanceof Error ? error.message : "Application safety ceiling failed"); }
  if (input.strategyState !== "ACTIVE") return hold("PAUSED", checks, "Mandate is paused");
  if (!input.signatureValid || !input.authorizationEpochCurrent) return hold("UNAUTHORIZED", checks, "Approval or authorization epoch is invalid");
  if (input.now >= input.strategy.expiresAt) return hold("EXPIRED", checks, "Mandate has expired");
  if (!input.providerHealthy) return hold("SESSION_UNAVAILABLE", checks, "Execution provider is unavailable");
  if (input.unresolvedAction) return hold("PENDING_RECONCILIATION", checks, "Wallet has an unresolved mutation");
  const observation = input.observation;
  if (!observation || !sameObservation(observation, input.approvedMarket, input.strategy)) return hold("CONFIG_CHANGED", checks, "Observation provenance does not match the approved market");
  if (observation.indexingErrors) return hold("INDEXING_ERROR", checks, "Graph source reports indexing errors");
  if (!observation.healthy || observation.sourceBlockAgeSeconds > input.strategy.guards.maxSourceBlockAgeSeconds || observation.lastSwapAgeSeconds > input.strategy.guards.maxLastSwapAgeSeconds) return hold("DATA_STALE", checks, "Graph evidence failed freshness requirements");
  if (BigInt(observation.sourceTvlUsdAtomic) < BigInt(input.strategy.guards.minSourceTvlUsd)) return hold("TRIGGER_NOT_MET", checks, "Source TVL is below the approved floor");

  let currentScheduleKey: string | undefined;
  if (input.strategy.trigger.type === "schedule") {
    const key = scheduleKey(input.strategy.trigger.startAt, input.strategy.trigger.everySeconds, input.now);
    if (!key || input.executedScheduleKeys.has(key)) return hold("NOT_DUE", checks, "Current schedule window is not eligible");
    currentScheduleKey = key;
  } else {
    const actual = BigInt(observation.referencePriceUsdcAtomic), threshold = BigInt(input.strategy.trigger.priceUsdc);
    const met = input.strategy.trigger.comparator === "lte" ? actual <= threshold : actual >= threshold;
    if (!met) return hold("TRIGGER_NOT_MET", checks, "Reference price has not crossed the approved level");
  }
  if (input.lastExecutionAt !== undefined && input.now - input.lastExecutionAt < input.strategy.limits.cooldownSeconds) return hold("COOLDOWN", checks, "Approved cooldown has not elapsed");
  if (input.executionCount >= input.strategy.limits.maxExecutions) return hold("EXECUTION_COUNT", checks, "Maximum execution count reached");
  const amount = input.strategy.amountInAtomic;
  if (BigInt(amount) > BigInt(input.strategy.limits.maxTradeNotionalUsdcAtomic)) return hold("TRADE_LIMIT", checks, "Input exceeds per-trade mandate limit");
  if (BigInt(input.dailyTurnoverAtomic) + BigInt(amount) > BigInt(input.strategy.limits.maxDailyTurnoverUsdcAtomic)) return hold("DAILY_LIMIT", checks, "Input would exceed UTC daily turnover limit");
  const unavailable = BigInt(input.pendingOutflowAtomic) + BigInt(input.strategy.limits.minUsdcReserveAtomic) + BigInt(input.gasBufferAtomic);
  if (BigInt(input.usdcBalanceAtomic) < BigInt(amount) + unavailable) return hold(BigInt(input.usdcBalanceAtomic) < BigInt(amount) ? "INSUFFICIENT_BALANCE" : "RESERVE_VIOLATION", checks, "Input would consume reserved or unavailable USDC");
  if (input.prospectiveAssetAllocationBps === null || input.prospectiveAssetAllocationBps > input.strategy.limits.maxAssetAllocationBps) return hold("ALLOCATION_LIMIT", checks, "Fresh executable valuation is unavailable or exceeds the allocation cap");
  const quote = input.quote;
  if (!quote || !sameQuote(quote, input.approvedMarket, amount)) return hold("QUOTE_UNAVAILABLE", checks, "Quote identity does not match the approved wallet, chain, market, and asset direction");
  const quoteExpiry = Math.min(quote.expiresAt ?? quote.createdAt + 20, quote.createdAt + 20);
  if (input.now > quoteExpiry) return hold("QUOTE_EXPIRED", checks, "Execution quote is older than the allowed window");
  let minOut: Atomic;
  try { minOut = minimumOutput(quote.outputAtomic, input.strategy.limits.maxSlippageBps); } catch { return hold("INVALID_MIN_OUT", checks, "Quote cannot produce a positive minimum output"); }
  checks.push({ code: "OK", passed: true, fact: "All deterministic guards passed" });
  return { decision: "EXECUTE", checks, action: { amountInAtomic: atomic(amount), minimumOutputAtomic: minOut, ...(currentScheduleKey ? { scheduleKey: currentScheduleKey } : {}) } };
}
