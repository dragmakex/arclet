import { authenticatedDatabaseUser } from "../../../lib/request-user";
import { database } from "../../../lib/repository";
import { safeApiError } from "../../../lib/http";

/** Tenant-scoped archive. Receipts appear only after chain reconciliation succeeds. */
export async function GET(request: Request) {
  try {
    const { user } = await authenticatedDatabaseUser(request);
    const items = await database()`
      SELECT d.id,d.result,d.reasons,d.created_at,e.id AS execution_id,e.state AS execution_state,
        COALESCE(jsonb_agg(jsonb_build_object('transactionHash',et.transaction_hash,'chainId',et.chain_id))
          FILTER (WHERE et.receipt_status='success'), '[]'::jsonb) AS receipts,
        CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
          'provenance',o.provenance,'metrics',o.normalized_metrics,'qualityVerdict',o.quality_verdict
        ) END AS observation
      FROM decisions d
      JOIN strategies s ON s.id=d.strategy_id
      LEFT JOIN executions e ON e.decision_id=d.id
      LEFT JOIN execution_transactions et ON et.execution_id=e.id
      LEFT JOIN market_observations o ON o.id=d.observation_id
      WHERE s.user_id=${user.id}
      GROUP BY d.id,e.id,o.id
      ORDER BY d.created_at DESC LIMIT 50
    `;
    return Response.json({
      items: items.map((item: Record<string, unknown>) => ({
        id: item.id,
        result: item.result,
        reasons: item.reasons,
        createdAt: item.created_at,
        executionState: item.execution_state,
        receipts: item.receipts,
        observation: item.observation
      })),
      nextCursor: null
    });
  } catch (error) {
    return safeApiError(error);
  }
}
