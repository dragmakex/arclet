import { canonicalHash } from "@arclet/domain";
export function buildProvenance(input: { subgraphId: string; deploymentId: string; sourceChainId: number; poolId: string; sourceBlockNumber: number; sourceBlockHash?: string; sourceBlockTime: number; latestSwapTime: number; fetchedAt: number; queryName: string; normalizedMetrics: unknown; rawResponse: unknown }) {
  return { provider: "the-graph", gatewayHost: "gateway.thegraph.com", ...input, queryHash: canonicalHash(input.queryName), rawResponseHash: canonicalHash(input.rawResponse), normalizedMetricsHash: canonicalHash(input.normalizedMetrics) };
}
