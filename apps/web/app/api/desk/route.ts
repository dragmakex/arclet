import registry from "../../../../../config/markets.json";
import { authenticatedDatabaseUser } from "../../../lib/request-user";
import { assignedWallet, database } from "../../../lib/repository";
import { normalizeSnapshots } from "../../../lib/desk";
import { safeApiError } from "../../../lib/http";

/** Read-only tenant-scoped data for the wallet desk. */
export async function GET(request: Request) {
  try {
    const { user } = await authenticatedDatabaseUser(request);
    const wallet = await assignedWallet(user.id);
    const strategies = await database()<[{ id: string; state: string }]>`
      SELECT id,state FROM strategies
      WHERE user_id=${user.id} AND state IN ('ACTIVE','PAUSED')
      ORDER BY created_at DESC LIMIT 1
    `;
    if (!wallet) return Response.json({ wallet: null, activeStrategy: strategies[0] ?? null, snapshots: [], entries: [] });
    const [snapshotRows, entries] = await Promise.all([
      database()<Array<{ observed_at: Date; usdc_atomic: string | null }>>`
        SELECT observed_at,erc20_balances->>'USDC' AS usdc_atomic FROM wallet_snapshots
        WHERE wallet_id=${wallet.id} AND reconciliation_state='coherent'
        ORDER BY observed_at ASC LIMIT 180
      `,
      database()`
        SELECT d.id,d.result,d.reasons,d.created_at,e.state AS "executionState",v.canonical_spec->>'marketId' AS "marketId",
          COALESCE(jsonb_agg(jsonb_build_object('transactionHash',et.transaction_hash,'chainId',et.chain_id))
            FILTER (WHERE et.receipt_status='success'), '[]'::jsonb) AS receipts,
          CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
            'provenance',o.provenance,'metrics',o.normalized_metrics,'qualityVerdict',o.quality_verdict
          ) END AS observation
        FROM decisions d
        JOIN strategies s ON s.id=d.strategy_id
        JOIN strategy_versions v ON v.strategy_id=s.id AND v.version=s.current_version
        LEFT JOIN executions e ON e.decision_id=d.id
        LEFT JOIN execution_transactions et ON et.execution_id=e.id
        LEFT JOIN market_observations o ON o.id=d.observation_id
        WHERE s.user_id=${user.id}
        GROUP BY d.id,e.id,v.canonical_spec,o.id
        ORDER BY d.created_at DESC LIMIT 40
      `
    ]);
    const enrichedEntries = entries.map((entry: Record<string, unknown>) => {
      const marketId = typeof entry.marketId === "string" ? entry.marketId : null;
      const market = marketId ? registry.markets.find((candidate) => candidate.id === marketId) : null;
      return {
        id: entry.id,
        result: entry.result,
        reasons: entry.reasons,
        createdAt: entry.created_at,
        executionState: entry.executionState,
        receipts: entry.receipts,
        observation: entry.observation,
        market: market ? {
          id: market.id,
          mappingKind: market.mappingKind,
          sourcePair: market.sourcePair,
          executionChainId: market.executionChainId,
          outputAsset: market.outputAsset
        } : null
      };
    });
    return Response.json({
      wallet: { address: wallet.address, operatingMode: "application-operated" },
      activeStrategy: strategies[0] ?? null,
      snapshots: normalizeSnapshots(snapshotRows),
      entries: enrichedEntries
    });
  } catch (error) {
    return safeApiError(error);
  }
}
