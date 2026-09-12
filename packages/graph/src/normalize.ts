import Decimal from "decimal.js";
import { z } from "zod";
import { getAddress } from "viem";
import { decimalToAtomic, type Atomic } from "@arclet/domain";

const tokenSchema = z.object({ id: z.string(), symbol: z.string().max(32), decimals: z.string().regex(/^\d+$/) }).strict();
export const snapshotDataSchema = z.object({
  pool: z.object({ id: z.string(), sqrtPrice: z.string().regex(/^\d+$/), token0: tokenSchema, token1: tokenSchema, totalValueLockedUSD: z.string(), volumeUSD: z.string() }).strict().nullable(),
  swaps: z.array(z.object({ id: z.string(), timestamp: z.string().regex(/^\d+$/), transaction: z.object({ id: z.string() }).strict() }).strict()).max(1),
  _meta: z.object({ deployment: z.string(), hasIndexingErrors: z.boolean(), block: z.object({ number: z.number().int().nonnegative(), hash: z.string().optional() }).strict() }).strict()
}).strict();
export type SnapshotData = z.infer<typeof snapshotDataSchema>;
export type NormalizedGraphSnapshot = { deployment: string; pool: `0x${string}`; sourceBlock: number; sourceBlockHash?: string; latestSwapAt: number; sourceTvlUsdAtomic6: Atomic; referencePriceUsdcAtomic6: Atomic; token0: `0x${string}`; token1: `0x${string}`; healthy: true };

export function normalizeSnapshot(data: SnapshotData, expected: { pool: string; referenceToken: string; usdcToken: string }): NormalizedGraphSnapshot {
  if (!data.pool) throw new Error("Graph response omitted the approved pool");
  if (data._meta.hasIndexingErrors) throw new Error("Graph deployment has indexing errors");
  if (!data.swaps[0]) throw new Error("Graph response omitted the latest swap");
  const pool = getAddress(data.pool.id), expectedPool = getAddress(expected.pool);
  if (pool !== expectedPool) throw new Error("Graph returned the wrong pool");
  const token0 = getAddress(data.pool.token0.id), token1 = getAddress(data.pool.token1.id);
  const expectedTokens = new Set([getAddress(expected.referenceToken), getAddress(expected.usdcToken)]);
  if (!expectedTokens.has(token0) || !expectedTokens.has(token1) || token0 === token1) throw new Error("Graph pool token pair does not match the registry");
  const d0 = Number(data.pool.token0.decimals), d1 = Number(data.pool.token1.decimals);
  if (!Number.isInteger(d0) || !Number.isInteger(d1) || d0 > 36 || d1 > 36) throw new Error("Malformed token decimals");
  const ratio1Per0 = new Decimal(data.pool.sqrtPrice).pow(2).div(new Decimal(2).pow(192)).mul(new Decimal(10).pow(d0 - d1));
  const usdc = getAddress(expected.usdcToken);
  const usdcPerReference = token1 === usdc ? ratio1Per0 : new Decimal(1).div(ratio1Per0);
  const base = { deployment: data._meta.deployment, pool, sourceBlock: data._meta.block.number, latestSwapAt: Number(data.swaps[0].timestamp), sourceTvlUsdAtomic6: decimalToAtomic(data.pool.totalValueLockedUSD, 6), referencePriceUsdcAtomic6: decimalToAtomic(usdcPerReference.toFixed(6, Decimal.ROUND_DOWN), 6), token0, token1, healthy: true as const };
  return data._meta.block.hash ? { ...base, sourceBlockHash: data._meta.block.hash } : base;
}
