import { authenticatedDatabaseUser } from "../../../../lib/request-user";
import { database } from "../../../../lib/repository";
import { safeApiError } from "../../../../lib/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticatedDatabaseUser(request);
    const rows = await database()`
      SELECT d.id,d.result,d.reasons,d.proposed_action,d.created_at,e.state AS execution_state,
        COALESCE(jsonb_agg(jsonb_build_object('transactionHash',et.transaction_hash,'chainId',et.chain_id))
          FILTER (WHERE et.receipt_status='success'), '[]'::jsonb) AS receipts,
        o.provenance,o.normalized_metrics,o.quality_verdict
      FROM decisions d
      JOIN strategies s ON s.id=d.strategy_id
      LEFT JOIN executions e ON e.decision_id=d.id
      LEFT JOIN execution_transactions et ON et.execution_id=e.id
      LEFT JOIN market_observations o ON o.id=d.observation_id
      WHERE d.id=${(await context.params).id} AND s.user_id=${user.id}
      GROUP BY d.id,e.id,o.id
    `;
    if (!rows[0]) throw new Error("NOT_FOUND");
    return Response.json(rows[0]);
  } catch (error) {
    return safeApiError(error);
  }
}
