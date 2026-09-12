import { canonicalHash } from "@arclet/domain";

/**
 * Persisted Graph provenance deliberately stores hashes, not the raw gateway response.
 * Raw provider data can contain unexpected fields and does not belong in every decision row.
 */
export function buildProvenance(input: {
  subgraphId: string;
  deploymentId: string;
  sourceChainId: number;
  poolId: string;
  sourceBlockNumber: number;
  sourceBlockHash: string;
  sourceBlockTime: number;
  latestSwapTime: number;
  fetchedAt: number;
  queryName: string;
  queryDocument: string;
  variables: Record<string, unknown>;
  normalizedMetrics: unknown;
  rawResponse: unknown;
}) {
  const { queryDocument, variables, normalizedMetrics, rawResponse, ...record } = input;
  return {
    provider: "the-graph",
    gatewayHost: "gateway.thegraph.com",
    ...record,
    queryHash: canonicalHash({ document: queryDocument, variables }),
    rawResponseHash: canonicalHash(rawResponse),
    normalizedMetricsHash: canonicalHash(normalizedMetrics)
  };
}
