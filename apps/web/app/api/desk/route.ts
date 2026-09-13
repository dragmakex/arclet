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
    if (!wallet) {
      return Response.json({ wallet: null, activeStrategy: strategies[0] ?? null, snapshots: [], entries: [] });
    }
    const [snapshotRows, entries] = await Promise.all([
      database()<Array<{ observed_at: Date; usdc_atomic: string | null }>>`
        SELECT observed_at,erc20_balances->>'USDC' AS usdc_atomic FROM wallet_snapshots
        WHERE wallet_id=${wallet.id} AND reconciliation_state='coherent'
        ORDER BY observed_at ASC LIMIT 180
      `,
      database()`
        SELECT d.id,d.result,d.reasons,d.created_at,e.state AS "executionState",
          CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
            'provenance',o.provenance,'metrics',o.normalized_metrics,'qualityVerdict',o.quality_verdict
          ) END AS observation
        FROM decisions d
        JOIN strategies s ON s.id=d.strategy_id
        LEFT JOIN executions e ON e.decision_id=d.id
        LEFT JOIN market_observations o ON o.id=d.observation_id
        WHERE s.user_id=${user.id}
        ORDER BY d.created_at DESC LIMIT 40
      `
    ]);
    return Response.json({
      wallet: { address: wallet.address, operatingMode: "application-operated" },
      activeStrategy: strategies[0] ?? null,
      snapshots: normalizeSnapshots(snapshotRows),
      entries
    });
  } catch (error) {
    return safeApiError(error);
  }
}
