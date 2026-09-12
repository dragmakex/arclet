import { z } from "zod";
import { positiveAtomicSchema, atomicSchema } from "./money";
import { hashSchema } from "./assets";

const scheduleTrigger = z.object({ type: z.literal("schedule"), startAt: z.number().int().nonnegative(), everySeconds: z.number().int().min(3600) }).strict();
const priceTrigger = z.object({ type: z.literal("reference_price"), comparator: z.enum(["lte", "gte"]), priceUsdc: positiveAtomicSchema }).strict();
const changeTrigger = z.object({ type: z.literal("completed_24h_change"), comparator: z.enum(["lte", "gte"]), changeBps: z.number().int().min(-10000).max(100000) }).strict();
const allocationTrigger = z.object({ type: z.literal("allocation_band"), targetAssetBps: z.number().int().min(1).max(9999), toleranceBps: z.number().int().min(1).max(5000) }).strict();
export const triggerSchema = z.discriminatedUnion("type", [scheduleTrigger, priceTrigger, changeTrigger, allocationTrigger]);

export const strategySpecSchema = z.object({
  schemaVersion: z.literal(1), marketId: z.enum(["usdc-cirbtc", "usdc-eurc"]), marketConfigHash: hashSchema,
  executionChainId: z.literal(5042002), type: z.enum(["dca", "conditional", "rebalance"]), side: z.enum(["buy", "sell", "rebalance"]),
  amountInAtomic: atomicSchema.nullable(), trigger: triggerSchema,
  guards: z.object({ minSourceTvlUsd: atomicSchema, maxSourceBlockAgeSeconds: z.number().int().min(1).max(3600), maxLastSwapAgeSeconds: z.number().int().min(1).max(86400), requireHealthyGraph: z.literal(true) }).strict(),
  limits: z.object({ maxTradeNotionalUsdcAtomic: positiveAtomicSchema, maxDailyTurnoverUsdcAtomic: positiveAtomicSchema, minUsdcReserveAtomic: atomicSchema, maxAssetAllocationBps: z.number().int().min(1).max(10000), maxSlippageBps: z.number().int().min(1).max(100), cooldownSeconds: z.number().int().nonnegative(), maxExecutions: z.number().int().min(1).max(100) }).strict(),
  mode: z.enum(["auto_within_limits", "review_each_trade"]), expiresAt: z.number().int().positive()
}).strict().superRefine((spec, ctx) => {
  if (spec.type === "dca" && (spec.side !== "buy" || spec.trigger.type !== "schedule" || spec.amountInAtomic === null || BigInt(spec.amountInAtomic) <= 0n)) ctx.addIssue({ code: "custom", message: "DCA must be a positive fixed buy with a schedule" });
  if (spec.type === "conditional" && (!(["reference_price", "completed_24h_change"] as string[]).includes(spec.trigger.type) || spec.side === "rebalance" || spec.amountInAtomic === null || BigInt(spec.amountInAtomic) <= 0n)) ctx.addIssue({ code: "custom", message: "Conditional strategies require a positive fixed buy/sell and price trigger" });
  if (spec.type === "rebalance" && (spec.side !== "rebalance" || spec.trigger.type !== "allocation_band" || spec.amountInAtomic !== null)) ctx.addIssue({ code: "custom", message: "Rebalance requires an allocation band and no fixed amount" });
});
export type StrategySpec = z.infer<typeof strategySpecSchema>;
export const compileResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("needs_clarification"), questions: z.array(z.string().min(1)).max(3), unsupportedReasons: z.array(z.string()).max(3) }).strict(),
  z.object({ kind: z.literal("draft"), spec: strategySpecSchema, proposedDefaults: z.array(z.string()).max(10), plainLanguageSummary: z.string().min(1).max(1000), sourceObservationIds: z.array(z.string().uuid()).max(5) }).strict()
]);
