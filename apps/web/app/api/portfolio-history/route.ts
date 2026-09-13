import { authenticatedDatabaseUser } from "../../../lib/request-user";
import { assignedWallet, database } from "../../../lib/repository";
import { normalizeSnapshots } from "../../../lib/desk";
import { safeApiError } from "../../../lib/http";

/** Actual persisted ERC-20 USDC snapshots only. This is not a P&L series. */
export async function GET(request: Request) {
  try {
    const { user } = await authenticatedDatabaseUser(request);
    const wallet = await assignedWallet(user.id);
    if (!wallet) return Response.json({ measure: "ERC-20 USDC balance", series: [] });
    const rows = await database()<Array<{ observed_at: Date; usdc_atomic: string | null }>>`
      SELECT observed_at,erc20_balances->>'USDC' AS usdc_atomic FROM wallet_snapshots
      WHERE wallet_id=${wallet.id} AND reconciliation_state='coherent'
      ORDER BY observed_at ASC LIMIT 180
    `;
    return Response.json({
      measure: "ERC-20 USDC balance",
      accountingNote: "Native and ERC-20 USDC are two views of one balance. This series uses the persisted ERC-20 view only.",
      series: normalizeSnapshots(rows)
    });
  } catch (error) {
    return safeApiError(error);
  }
}
