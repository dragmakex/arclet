import type { Atomic, Hash, StrategySpec } from "@arclet/domain";
import { atomic, minimumOutput } from "@arclet/domain";

export type HoldCode = "PAUSED" | "EXPIRED" | "WRONG_ENVIRONMENT" | "CONFIG_CHANGED" | "UNAUTHORIZED" | "SESSION_UNAVAILABLE" | "DATA_STALE" | "INDEXING_ERROR" | "INSUFFICIENT_HISTORY" | "TRIGGER_NOT_MET" | "NOT_DUE" | "COOLDOWN" | "EXECUTION_COUNT" | "INSUFFICIENT_BALANCE" | "RESERVE_VIOLATION" | "DAILY_LIMIT" | "TRADE_LIMIT" | "ALLOCATION_LIMIT" | "QUOTE_UNAVAILABLE" | "QUOTE_EXPIRED" | "UNSUPPORTED_MARKET" | "PENDING_RECONCILIATION" | "INVALID_MIN_OUT" | "GLOBAL_KILL_SWITCH";
export type Check = { code: HoldCode | "OK"; passed: boolean; fact: string };
export type MarketObservation = { healthy: boolean; indexingErrors: boolean; sourceBlockAgeSeconds: number; lastSwapAgeSeconds: number; sourceTvlUsdAtomic: Atomic; referencePriceUsdcAtomic: Atomic; completed24hChangeBps?: number; marketConfigHash: Hash };
export type ExecutionQuote = { inputAtomic: Atomic; outputAtomic: Atomic; createdAt: number; expiresAt?: number; inputAsset: string; outputAsset: string };
export type PolicyInput = {
  strategy: StrategySpec; now: number; environment: "arc-testnet" | "arc-mainnet"; tradingEnabled: boolean; globalKillSwitch: boolean;
  strategyState: "ACTIVE" | "PAUSED"; signatureValid: boolean; authorizationEpochCurrent: boolean; providerHealthy: boolean; unresolvedAction: boolean;
  observation: MarketObservation | null; usdcBalanceAtomic: Atomic; pendingOutflowAtomic: Atomic; gasBufferAtomic: Atomic; dailyTurnoverAtomic: Atomic;
  executionCount: number; lastExecutionAt?: number; executedScheduleKeys: ReadonlySet<string>; quote: ExecutionQuote | null;
};
export type PolicyResult = { decision: "HOLD"; code: HoldCode; checks: Check[] } | { decision: "EXECUTE"; checks: Check[]; action: { amountInAtomic: Atomic; minimumOutputAtomic: Atomic; scheduleKey?: string } };

function hold(code: HoldCode, checks: Check[], fact: string): PolicyResult { return { decision: "HOLD", code, checks: [...checks, { code, passed: false, fact }] }; }
function scheduleKey(start: number, every: number, now: number): string | null { if (now < start) return null; return `${start}:${every}:${Math.floor((now - start) / every)}`; }

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const checks: Check[] = [];
  if (input.globalKillSwitch) return hold("GLOBAL_KILL_SWITCH", checks, "Global trading kill switch is active");
  if (!input.tradingEnabled || input.environment !== "arc-testnet") return hold("WRONG_ENVIRONMENT", checks, "Autonomous execution is allowed only on explicitly enabled Arc Testnet");
  if (input.strategyState !== "ACTIVE") return hold("PAUSED", checks, "Mandate is paused");
  if (!input.signatureValid || !input.authorizationEpochCurrent) return hold("UNAUTHORIZED", checks, "Approval or authorization epoch is invalid");
  if (input.now >= input.strategy.expiresAt) return hold("EXPIRED", checks, "Mandate has expired");
  if (!input.providerHealthy) return hold("SESSION_UNAVAILABLE", checks, "Execution provider is unavailable");
  if (input.unresolvedAction) return hold("PENDING_RECONCILIATION", checks, "Wallet has an unresolved mutation");
  const observation = input.observation;
  if (!observation) return hold("DATA_STALE", checks, "No approved market observation is available");
  if (observation.marketConfigHash !== input.strategy.marketConfigHash) return hold("CONFIG_CHANGED", checks, "Market registry changed after approval");
  if (observation.indexingErrors) return hold("INDEXING_ERROR", checks, "Graph source reports indexing errors");
  if (!observation.healthy || observation.sourceBlockAgeSeconds > input.strategy.guards.maxSourceBlockAgeSeconds || observation.lastSwapAgeSeconds > input.strategy.guards.maxLastSwapAgeSeconds) return hold("DATA_STALE", checks, "Graph evidence failed freshness requirements");
  if (BigInt(observation.sourceTvlUsdAtomic) < BigInt(input.strategy.guards.minSourceTvlUsd)) return hold("TRIGGER_NOT_MET", checks, "Source TVL is below the approved floor");

  let currentScheduleKey: string | undefined;
  if (input.strategy.trigger.type === "schedule") {
    const key = scheduleKey(input.strategy.trigger.startAt, input.strategy.trigger.everySeconds, input.now);
    if (!key || input.executedScheduleKeys.has(key)) return hold("NOT_DUE", checks, "Current schedule window is not eligible");
    currentScheduleKey = key;
  } else if (input.strategy.trigger.type === "reference_price") {
    const actual = BigInt(observation.referencePriceUsdcAtomic), threshold = BigInt(input.strategy.trigger.priceUsdc);
    const met = input.strategy.trigger.comparator === "lte" ? actual <= threshold : actual >= threshold;
    if (!met) return hold("TRIGGER_NOT_MET", checks, "Reference price has not crossed the approved level");
  } else if (input.strategy.trigger.type === "completed_24h_change") {
    if (observation.completed24hChangeBps === undefined) return hold("INSUFFICIENT_HISTORY", checks, "Completed-hour history is unavailable");
    const met = input.strategy.trigger.comparator === "lte" ? observation.completed24hChangeBps <= input.strategy.trigger.changeBps : observation.completed24hChangeBps >= input.strategy.trigger.changeBps;
    if (!met) return hold("TRIGGER_NOT_MET", checks, "Completed 24-hour change has not crossed the approved level");
  } else return hold("UNSUPPORTED_MARKET", checks, "Rebalance execution is not enabled in P0");

  if (input.lastExecutionAt !== undefined && input.now - input.lastExecutionAt < input.strategy.limits.cooldownSeconds) return hold("COOLDOWN", checks, "Approved cooldown has not elapsed");
  if (input.executionCount >= input.strategy.limits.maxExecutions) return hold("EXECUTION_COUNT", checks, "Maximum execution count reached");
  const amount = input.strategy.amountInAtomic;
  if (amount === null || BigInt(amount) <= 0n) return hold("UNSUPPORTED_MARKET", checks, "Fixed input is required for P0");
  if (BigInt(amount) > BigInt(input.strategy.limits.maxTradeNotionalUsdcAtomic)) return hold("TRADE_LIMIT", checks, "Input exceeds per-trade mandate limit");
  if (BigInt(input.dailyTurnoverAtomic) + BigInt(amount) > BigInt(input.strategy.limits.maxDailyTurnoverUsdcAtomic)) return hold("DAILY_LIMIT", checks, "Input would exceed UTC daily turnover limit");
  const unavailable = BigInt(input.pendingOutflowAtomic) + BigInt(input.strategy.limits.minUsdcReserveAtomic) + BigInt(input.gasBufferAtomic);
  if (BigInt(input.usdcBalanceAtomic) < BigInt(amount) + unavailable) return hold(BigInt(input.usdcBalanceAtomic) < BigInt(amount) ? "INSUFFICIENT_BALANCE" : "RESERVE_VIOLATION", checks, "Input would consume reserved or unavailable USDC");
  const quote = input.quote;
  if (!quote || quote.inputAtomic !== amount) return hold("QUOTE_UNAVAILABLE", checks, "A matching execution quote is unavailable");
  const quoteExpiry = Math.min(quote.expiresAt ?? input.now + 20, quote.createdAt + 20);
  if (input.now > quoteExpiry) return hold("QUOTE_EXPIRED", checks, "Execution quote is older than the allowed window");
  let minOut: Atomic;
  try { minOut = minimumOutput(quote.outputAtomic, input.strategy.limits.maxSlippageBps); } catch { return hold("INVALID_MIN_OUT", checks, "Quote cannot produce a positive minimum output"); }
  checks.push({ code: "OK", passed: true, fact: "All deterministic guards passed" });
  return { decision: "EXECUTE", checks, action: { amountInAtomic: atomic(amount), minimumOutputAtomic: minOut, ...(currentScheduleKey ? { scheduleKey: currentScheduleKey } : {}) } };
}
