import { canonicalHash, minimumOutput } from "@arclet/domain";
import { normalizedQuoteSchema, type CircleTradingAdapter, type SubmissionReference } from "@arclet/circle";
import type { Sql } from "postgres";
import { z } from "zod";
import { withWalletLock } from "./wallet-lock";
import { maySubmitTrade } from "../../../config/runtime";

type Job = { id: string; payload: unknown; fencing_token: string; lease_owner: string };
type SubmissionRow = {
  id: string; state: string; authorization_epoch: string; provider_idempotency_key: string; quote: unknown; wallet_id: string; wallet_address: `0x${string}`;
  strategy_state: string; current_epoch: string; canonical_spec: { limits: { maxSlippageBps: number } };
};

export function canSubmitReserved(input: { executionState: string; strategyState: string; executionEpoch: string; strategyEpoch: string; activeLease: boolean }): boolean {
  return input.executionState === "RESERVED" && input.strategyState === "ACTIVE" && input.executionEpoch === input.strategyEpoch && input.activeLease;
}

export async function submitJob(sql: Sql<Record<string, never>>, job: Job, adapter: CircleTradingAdapter) {
  const { executionId } = z.object({ executionId: z.string().uuid() }).parse(job.payload);
  const walletRows = await sql<[{ wallet_id: string }]>`SELECT wallet_id FROM executions WHERE id=${executionId}`;
  if (!walletRows[0]) return finish(sql, job);
  await withWalletLock(sql, walletRows[0].wallet_id, async (connection) => {
    // The wait for the advisory lock is a pause race. Everything that authorizes
    // submission, including the job fence, must be read after it is acquired.
    const rows = await connection<SubmissionRow[]>`SELECT e.id,e.state,e.authorization_epoch::text,e.provider_idempotency_key,e.quote,e.wallet_id,w.address AS wallet_address,s.state AS strategy_state,s.authorization_epoch::text AS current_epoch,v.canonical_spec FROM executions e JOIN decisions d ON d.id=e.decision_id JOIN strategies s ON s.id=d.strategy_id JOIN strategy_versions v ON v.strategy_id=s.id AND v.version=s.current_version JOIN trading_wallets w ON w.id=e.wallet_id WHERE e.id=${executionId}`;
    const row = rows[0];
    const activeLease = await connection<[{ id: string }]>`SELECT id FROM jobs WHERE id=${job.id} AND terminal=false AND fencing_token=${job.fencing_token} AND lease_owner=${job.lease_owner} AND lease_expires_at>now()`;
    if (!row) return finish(connection, job);
    const owners = await connection<[{ privy_user_id: string }]>`SELECT u.privy_user_id FROM executions e JOIN decisions d ON d.id=e.decision_id JOIN strategies s ON s.id=d.strategy_id JOIN users u ON u.id=s.user_id WHERE e.id=${row.id}`;
    if (!owners[0] || !maySubmitTrade(owners[0].privy_user_id)) {
      // Do not release reservations for an already submitted/uncertain action.
      if (row.state === "RESERVED") return cancelReserved(connection, job, row.id);
      return finish(connection, job);
    }
    if (!canSubmitReserved({ executionState: row.state, strategyState: row.strategy_state, executionEpoch: row.authorization_epoch, strategyEpoch: row.current_epoch, activeLease: Boolean(activeLease[0]) })) return cancelReserved(connection, job, row.id);

    const quote = normalizedQuoteSchema.parse(row.quote);
    const now = Math.floor(Date.now() / 1000);
    if (now > Math.min(quote.expiresAt ?? quote.createdAt + 20, quote.createdAt + 20)) return cancelReserved(connection, job, row.id);
    const minimumOutputAtomic = minimumOutput(quote.outputAtomic, row.canonical_spec.limits.maxSlippageBps);
    const transitioned = await connection<[{ id: string }]>`UPDATE executions e SET state='SUBMITTING',submitted_payload_hash=${canonicalHash({ quote, minimumOutputAtomic, slippageBps: row.canonical_spec.limits.maxSlippageBps, idempotencyKey: row.provider_idempotency_key })} FROM decisions d,strategies s WHERE e.id=${row.id} AND e.state='RESERVED' AND d.id=e.decision_id AND s.id=d.strategy_id AND s.state='ACTIVE' AND e.authorization_epoch=s.authorization_epoch RETURNING e.id`;
    if (!transitioned[0]) return cancelReserved(connection, job, row.id);

    let reference: SubmissionReference;
    try {
      reference = await adapter.submitSwap({ quote, minimumOutputAtomic, slippageBps: row.canonical_spec.limits.maxSlippageBps, idempotencyKey: row.provider_idempotency_key });
    } catch {
      reference = { idempotencyKey: row.provider_idempotency_key, state: "unknown" };
    }
    const state = reference.state === "unknown" ? "UNKNOWN" : "SUBMITTED";
    await connection`UPDATE executions SET state=${state},provider_reference=${connection.json(reference)} WHERE id=${row.id} AND state='SUBMITTING'`;
    if (state === "UNKNOWN") await connection`UPDATE trading_wallets SET operating_mode='frozen' WHERE id=${row.wallet_id}`;
    await connection`INSERT INTO jobs (type,payload,dedupe_key,scheduled_at) VALUES ('RECONCILE',${connection.json({ executionId: row.id })},${`reconcile:${row.id}`},now() + interval '5 seconds') ON CONFLICT (dedupe_key) DO UPDATE SET terminal=false,scheduled_at=EXCLUDED.scheduled_at`;
    await finish(connection, job);
  });
}

async function cancelReserved(sql: Sql<Record<string, never>>, job: Job, executionId: string) {
  await sql`UPDATE executions SET state='CANCELLED' WHERE id=${executionId} AND state='RESERVED'`;
  await sql`UPDATE budget_reservations SET state='released' WHERE execution_id=${executionId} AND state='reserved'`;
  await finish(sql, job);
}
async function finish(sql: Sql<Record<string, never>>, job: Job) { await sql`UPDATE jobs SET terminal=true WHERE id=${job.id} AND fencing_token=${job.fencing_token} AND lease_owner=${job.lease_owner}`; }
