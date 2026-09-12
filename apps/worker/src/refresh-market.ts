import { canonicalHash } from "@arclet/domain";
import { GraphClient, buildProvenance, normalizeSnapshot, snapshotDataSchema } from "@arclet/graph";
import type { Sql } from "postgres";
import { createPublicClient, getAddress, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import { z } from "zod";
import registry from "../../../config/markets.json";

const enabledSchema = z.object({
  id: z.enum(["usdc-cirbtc", "usdc-eurc"]), enabled: z.literal(true), marketConfigHash: z.string(), sourceChainId: z.literal(1), deployment: z.string(), pool: z.string(), sourceReferenceToken: z.string(), sourceUsdcToken: z.string(),
  factory: z.string().regex(/^0x[0-9a-fA-F]{40}$/), feeTier: z.number().int().positive()
}).passthrough();
const metaSchema = z.object({ _meta: z.object({ deployment: z.string(), hasIndexingErrors: z.boolean(), block: z.object({ number: z.number(), hash: z.string().optional() }) }) });
const metaDocument = "query ArcletMeta { _meta { deployment hasIndexingErrors block { number hash } } }";
const poolAbi = parseAbi(["function token0() view returns (address)", "function token1() view returns (address)"]);
const factoryAbi = parseAbi(["function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)"]);

export async function refreshMarkets(sql: Sql<Record<string, never>>) {
  const key = process.env.GRAPH_API_KEY, rpcUrl = process.env.SOURCE_RPC_URL, subgraph = process.env.GRAPH_SUBGRAPH_ID;
  if (!key || !rpcUrl || !subgraph) return;
  const rpc = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
  const actualChainId = await rpc.getChainId();
  const document = await Bun.file("packages/graph/src/queries/market-snapshot.graphql").text();
  const client = new GraphClient(`https://gateway.thegraph.com/api/subgraphs/id/${subgraph}`, key);
  for (const raw of registry.markets) {
    const parsed = enabledSchema.safeParse(raw);
    if (!parsed.success) continue;
    const market = parsed.data;
    if (actualChainId !== market.sourceChainId) throw new Error(`Source RPC chain ${actualChainId} does not match ${market.sourceChainId}`);
    const [token0, token1, factoryPool, head] = await Promise.all([
      rpc.readContract({ address: getAddress(market.pool), abi: poolAbi, functionName: "token0" }),
      rpc.readContract({ address: getAddress(market.pool), abi: poolAbi, functionName: "token1" }),
      rpc.readContract({ address: getAddress(market.factory), abi: factoryAbi, functionName: "getPool", args: [getAddress(market.sourceReferenceToken), getAddress(market.sourceUsdcToken), market.feeTier] }),
      rpc.getBlockNumber()
    ]);
    const expectedTokens = new Set([getAddress(market.sourceReferenceToken), getAddress(market.sourceUsdcToken)]);
    if (!expectedTokens.has(getAddress(token0)) || !expectedTokens.has(getAddress(token1)) || getAddress(token0) === getAddress(token1)) throw new Error(`Source pool token metadata failed for ${market.id}`);
    if (getAddress(factoryPool) !== getAddress(market.pool)) throw new Error(`Source factory does not recognize the configured pool for ${market.id}`);
    const meta = await client.query(metaDocument, {}, metaSchema);
    if (meta._meta.hasIndexingErrors || meta._meta.deployment !== market.deployment) throw new Error(`Graph metadata failed for ${market.id}`);
    const number = meta._meta.block.number;
    const block = await rpc.getBlock({ blockNumber: BigInt(number) });
    const data = await client.query(document, { pool: market.pool.toLowerCase(), poolKey: market.pool.toLowerCase(), block: number }, snapshotDataSchema);
    const now = Math.floor(Date.now() / 1000);
    const normalized = normalizeSnapshot(data, {
      sourceChainId: market.sourceChainId, deployment: market.deployment, pool: market.pool, referenceToken: market.sourceReferenceToken, usdcToken: market.sourceUsdcToken,
      maxBlockAgeSeconds: 180, maxHeadLagBlocks: 30, maxLastSwapAgeSeconds: 600
    }, { chainId: actualChainId, number, hash: block.hash, timestamp: Number(block.timestamp), headNumber: Number(head) }, now);
    const metrics = { marketId: market.id, marketConfigHash: market.marketConfigHash, ...normalized, sourceTvlUsdAtomic: normalized.sourceTvlUsdAtomic6, referencePriceUsdcAtomic: normalized.referencePriceUsdcAtomic6 };
    const provenance = buildProvenance({
      subgraphId: subgraph, deploymentId: market.deployment, sourceChainId: actualChainId, poolId: market.pool, sourceBlockNumber: number, sourceBlockHash: block.hash, sourceBlockTime: Number(block.timestamp), latestSwapTime: normalized.latestSwapAt,
      fetchedAt: now, queryName: "MarketSnapshot", queryDocument: document, variables: { pool: market.pool.toLowerCase(), poolKey: market.pool.toLowerCase(), block: number }, normalizedMetrics: metrics, rawResponse: data
    });
    await sql`INSERT INTO market_observations (environment,provider,provenance,normalized_metrics,payload_hash,quality_verdict) VALUES ('arc-testnet','the-graph',${sql.json(provenance)},${sql.json(metrics)},${canonicalHash(data)},'HEALTHY')`;
  }
}
