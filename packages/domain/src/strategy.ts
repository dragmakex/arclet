import { z } from "zod";
import { positiveAtomicSchema, atomicSchema } from "./money";
import { hashSchema } from "./assets";

const scheduleTrigger = z.object({ type: z.literal("schedule"), startAt: z.number().int().nonnegative(), everySeconds: z.number().int().min(3600) }).strict();
const priceTrigger = z.object({ type: z.literal("reference_price"), comparator: z.enum(["lte", "gte"]), priceUsdc: positiveAtomicSchema }).strict();
export const triggerSchema = z.discriminatedUnion("type", [scheduleTrigger, priceTrigger]);

export const strategySpecSchema = z.object({
  schemaVersion: z.literal(1),
  marketId: z.enum(["usdc-cirbtc", "usdc-eurc"]),
  marketConfigHash: hashSchema,
  executionChainId: z.literal(5042002),
  type: z.enum(["dca", "conditional"]),
  side: z.literal("buy"),
  amountInAtomic: positiveAtomicSchema,
  trigger: triggerSchema,
  guards: z.object({ minSourceTvlUsd: atomicSchema, maxSourceBlockAgeSeconds: z.number().int().min(1).max(180), maxLastSwapAgeSeconds: z.number().int().min(1).max(600), requireHealthyGraph: z.literal(true) }).strict(),
  limits: z.object({
    maxTradeNotionalUsdcAtomic: positiveAtomicSchema,
    maxDailyTurnoverUsdcAtomic: positiveAtomicSchema,
    minUsdcReserveAtomic: atomicSchema,
    maxAssetAllocationBps: z.number().int().min(1).max(3000),
    maxSlippageBps: z.number().int().min(1).max(100),
    cooldownSeconds: z.number().int().nonnegative(),
    maxExecutions: z.number().int().min(1).max(3)
  }).strict(),
  mode: z.literal("auto_within_limits"),
  expiresAt: z.number().int().positive()
}).strict().superRefine((spec, ctx) => {
  if (spec.type === "dca" && spec.trigger.type !== "schedule") ctx.addIssue({ code: "custom", message: "DCA requires a schedule" });
  if (spec.type === "conditional" && spec.trigger.type !== "reference_price") ctx.addIssue({ code: "custom", message: "Conditional strategies require a reference-price trigger" });
});
export type StrategySpec = z.infer<typeof strategySpecSchema>;

export type StrategySafetyLimits = {
  maxTradeUsdcAtomic: string;
  maxDailyTurnoverUsdcAtomic: string;
  minUsdcReserveAtomic: string;
  maxSlippageBps: number;
  maxExecutions: number;
  maxDurationSeconds: number;
};
export function validateStrategySafety(raw: unknown, now: number, runtime: StrategySafetyLimits): StrategySpec {
  const spec = strategySpecSchema.parse(raw);
  const violations: string[] = [];
  if (spec.expiresAt <= now || spec.expiresAt - now > runtime.maxDurationSeconds) violations.push("Mandate expiry must be in the future and no more than seven days away");
  if (BigInt(spec.amountInAtomic) > BigInt(runtime.maxTradeUsdcAtomic)) violations.push("Fixed input exceeds the application per-trade ceiling");
  if (BigInt(spec.limits.maxTradeNotionalUsdcAtomic) > BigInt(runtime.maxTradeUsdcAtomic)) violations.push("Mandate per-trade limit exceeds the application ceiling");
  if (BigInt(spec.limits.maxDailyTurnoverUsdcAtomic) > BigInt(runtime.maxDailyTurnoverUsdcAtomic)) violations.push("Mandate daily limit exceeds the application ceiling");
  if (BigInt(spec.limits.minUsdcReserveAtomic) < BigInt(runtime.minUsdcReserveAtomic)) violations.push("Mandate reserve is below the application floor");
  if (spec.limits.maxSlippageBps > runtime.maxSlippageBps) violations.push("Mandate slippage exceeds the application ceiling");
  if (spec.limits.maxExecutions > runtime.maxExecutions) violations.push("Mandate execution count exceeds the application ceiling");
  if (violations.length) throw new Error(violations.join("; "));
  return spec;
}

export const compileResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("needs_clarification"), questions: z.array(z.string().min(1)).max(3), unsupportedReasons: z.array(z.string()).max(3) }).strict(),
  z.object({ kind: z.literal("draft"), spec: strategySpecSchema, proposedDefaults: z.array(z.string()).max(10), plainLanguageSummary: z.string().min(1).max(1000), sourceObservationIds: z.array(z.string().uuid()).max(5) }).strict()
]);
