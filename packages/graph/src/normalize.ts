import Decimal from "decimal.js";
import { z } from "zod";
import { getAddress } from "viem";
import { decimalToAtomic, type Atomic } from "@arclet/domain";

const ExactDecimal = Decimal.clone({ precision: 100, rounding: Decimal.ROUND_DOWN });
const tokenSchema = z.object({ id: z.string(), symbol: z.string().max(32), decimals: z.string().regex(/^\d+$/) }).strict();
export const snapshotDataSchema = z.object({
  pool: z.object({ id: z.string(), sqrtPrice: z.string().regex(/^\d+$/), token0: tokenSchema, token1: tokenSchema, totalValueLockedUSD: z.string(), volumeUSD: z.string() }).strict().nullable(),
  swaps: z.array(z.object({ id: z.string(), timestamp: z.string().regex(/^\d+$/), transaction: z.object({ id: z.string() }).strict() }).strict()).max(1),
  _meta: z.object({ deployment: z.string(), hasIndexingErrors: z.boolean(), block: z.object({ number: z.number().int().nonnegative(), hash: z.string().optional() }).strict() }).strict()
}).strict();
export type SnapshotData = z.infer<typeof snapshotDataSchema>;
export type VerifiedSourceBlock = { chainId: number; number: number; hash: `0x${string}`; timestamp: number; headNumber: number };
export type ApprovedGraphSource = { sourceChainId: number; deployment: string; pool: string; referenceToken: string; usdcToken: string; maxBlockAgeSeconds: number; maxHeadLagBlocks: number; maxLastSwapAgeSeconds: number };
export type NormalizedGraphSnapshot = { deployment: string; pool: `0x${string}`; sourceChainId: number; sourceBlock: number; sourceBlockHash: `0x${string}`; sourceBlockTime: number; latestSwapAt: number; sourceBlockAgeSeconds: number; lastSwapAgeSeconds: number; headLagBlocks: number; sourceTvlUsdAtomic6: Atomic; referencePriceUsdcAtomic6: Atomic; token0: `0x${string}`; token1: `0x${string}`; healthy: true };

export function normalizeSnapshot(data: SnapshotData, expected: ApprovedGraphSource, verifiedBlock: VerifiedSourceBlock, now: number): NormalizedGraphSnapshot {
  if (!data.pool) throw new Error("Graph response omitted the approved pool");
  if (data._meta.hasIndexingErrors) throw new Error("Graph deployment has indexing errors");
  if (data._meta.deployment !== expected.deployment) throw new Error("Graph deployment does not match the approved registry");
  if (verifiedBlock.chainId !== expected.sourceChainId || verifiedBlock.number !== data._meta.block.number) throw new Error("Source RPC chain/block does not match Graph metadata");
  if (!data._meta.block.hash || data._meta.block.hash.toLowerCase() !== verifiedBlock.hash.toLowerCase()) throw new Error("Source RPC block hash does not match Graph metadata");
  if (!data.swaps[0]) throw new Error("Graph response omitted the latest swap");
  const pool = getAddress(data.pool.id), expectedPool = getAddress(expected.pool);
  if (pool !== expectedPool) throw new Error("Graph returned the wrong pool");
  const token0 = getAddress(data.pool.token0.id), token1 = getAddress(data.pool.token1.id);
  const expectedTokens = new Set([getAddress(expected.referenceToken), getAddress(expected.usdcToken)]);
  if (!expectedTokens.has(token0) || !expectedTokens.has(token1) || token0 === token1) throw new Error("Graph pool token pair does not match the registry");
  const d0 = Number(data.pool.token0.decimals), d1 = Number(data.pool.token1.decimals);
  if (!Number.isInteger(d0) || !Number.isInteger(d1) || d0 > 36 || d1 > 36) throw new Error("Malformed token decimals");
  const sourceBlockAgeSeconds = now - verifiedBlock.timestamp, latestSwapAt = Number(data.swaps[0].timestamp), lastSwapAgeSeconds = now - latestSwapAt, headLagBlocks = verifiedBlock.headNumber - verifiedBlock.number;
  if (sourceBlockAgeSeconds < 0 || sourceBlockAgeSeconds > expected.maxBlockAgeSeconds || lastSwapAgeSeconds < 0 || lastSwapAgeSeconds > expected.maxLastSwapAgeSeconds || headLagBlocks < 0 || headLagBlocks > expected.maxHeadLagBlocks) throw new Error("Graph snapshot failed source RPC freshness checks");
  const ratio1Per0 = new ExactDecimal(data.pool.sqrtPrice).pow(2).div(new ExactDecimal(2).pow(192)).mul(new ExactDecimal(10).pow(d0 - d1));
  const usdc = getAddress(expected.usdcToken), usdcPerReference = token1 === usdc ? ratio1Per0 : new ExactDecimal(1).div(ratio1Per0);
  return { deployment: data._meta.deployment, pool, sourceChainId: expected.sourceChainId, sourceBlock: verifiedBlock.number, sourceBlockHash: verifiedBlock.hash, sourceBlockTime: verifiedBlock.timestamp, latestSwapAt, sourceBlockAgeSeconds, lastSwapAgeSeconds, headLagBlocks, sourceTvlUsdAtomic6: decimalToAtomic(data.pool.totalValueLockedUSD, 6), referencePriceUsdcAtomic6: decimalToAtomic(usdcPerReference.toFixed(6), 6), token0, token1, healthy: true };
}
