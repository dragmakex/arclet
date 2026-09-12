import { createArcClient, erc20Abi, verifyErc20Transfer } from "@arclet/chain";
import type { CircleTradingAdapter, SubmissionReference } from "@arclet/circle";
import type { Sql } from "postgres";
import { z } from "zod";
import chain from "../../../config/chains/arc-testnet.json";
import { withWalletLock } from "./wallet-lock";

const GAS_BUFFER_USDC_ATOMIC = 100_000n;
type Job = { id: string; payload: unknown; fencing_token: string; lease_owner: string };
type WithdrawalRow = { id: string; state: string; asset_id: "USDC" | "EURC" | "cirBTC"; amount_atomic: string; destination_address: `0x${string}`; wallet_id: string; wallet_address: `0x${string}`; provider_reference: SubmissionReference | null };

export function hasSufficientWithdrawalBalances(input: { asset: WithdrawalRow["asset_id"]; amountAtomic: bigint; tokenBalance: bigint; nativeUsdcAtomic18: bigint }): boolean {
  const nativeUsdcAtomic6 = input.nativeUsdcAtomic18 / 1_000_000_000_000n;
  return input.tokenBalance >= input.amountAtomic && nativeUsdcAtomic6 >= GAS_BUFFER_USDC_ATOMIC && (input.asset !== "USDC" || nativeUsdcAtomic6 >= input.amountAtomic + GAS_BUFFER_USDC_ATOMIC);
}

export async function withdrawalJob(sql: Sql<Record<string, never>>, job: Job, adapter: CircleTradingAdapter) {
  const { withdrawalId } = z.object({ withdrawalId: z.string().uuid() }).parse(job.payload);
  const rows = await sql<WithdrawalRow[]>`SELECT wd.id,wd.state,wd.asset_id,wd.amount_atomic,wd.destination_address,wd.wallet_id,w.address AS wallet_address,wd.provider_reference FROM withdrawals wd JOIN trading_wallets w ON w.id=wd.wallet_id WHERE wd.id=${withdrawalId}`;
  const row = rows[0];
  if (!row) return finish(sql, job);
  await withWalletLock(sql, row.wallet_id, async (connection) => {
    const pending = await connection<[{ count: string }]>`SELECT count(*)::text AS count FROM executions WHERE wallet_id=${row.wallet_id} AND state IN ('SUBMITTING','SUBMITTED','UNKNOWN')`;
    const otherWithdrawal = await connection<[{ id: string }]>`SELECT id FROM withdrawals WHERE wallet_id=${row.wallet_id} AND id<>${row.id} AND state NOT IN ('CONFIRMED','FAILED','CANCELLED') LIMIT 1`;
    if (Number(pending[0]!.count) > 0 || otherWithdrawal[0]) return reschedule(connection, job);
    const token = chain.tokens[row.asset_id];
    if (token.decimals === null) return needsAttention(connection, job, row, "Token decimals are not verified");

    if (row.state === "AUTHORIZED") {
      const client = createArcClient(process.env.ARC_RPC_URL);
      const [nativeUsdcAtomic18, tokenBalance] = await Promise.all([
        client.getBalance({ address: row.wallet_address }),
        client.readContract({ address: token.address as `0x${string}`, abi: erc20Abi, functionName: "balanceOf", args: [row.wallet_address] })
      ]);
      const amount = BigInt(row.amount_atomic);
      if (!hasSufficientWithdrawalBalances({ asset: row.asset_id, amountAtomic: amount, tokenBalance, nativeUsdcAtomic18 })) {
        return needsAttention(connection, job, row, "Reconciled balance cannot cover the authorized transfer and native USDC gas buffer");
      }
      const transitioned = await connection<[{ id: string }]>`UPDATE withdrawals SET state='SUBMITTING' WHERE id=${row.id} AND state='AUTHORIZED' RETURNING id`;
      if (!transitioned[0]) return reschedule(connection, job);
      let reference: SubmissionReference;
      try {
        reference = await adapter.submitTransfer({ chain: "ARC-TESTNET", wallet: row.wallet_address, destination: row.destination_address, asset: row.asset_id, amountAtomic: row.amount_atomic, decimals: token.decimals });
      } catch {
        reference = { state: "unknown" };
      }
      const state = reference.state === "unknown" ? "UNKNOWN" : "SUBMITTED";
      await connection`UPDATE withdrawals SET state=${state},provider_reference=${connection.json(reference)} WHERE id=${row.id} AND state='SUBMITTING'`;
      if (state === "UNKNOWN") await connection`UPDATE trading_wallets SET operating_mode='frozen' WHERE id=${row.wallet_id}`;
      return reschedule(connection, job);
    }
    if (!row.provider_reference) return needsAttention(connection, job, row, "Withdrawal has no provider reference for reconciliation");
    const status = await adapter.reconcile(row.provider_reference, row.wallet_address);
    if (status.state === "pending" || status.state === "unknown") {
      await connection`UPDATE withdrawals SET state=${status.state === "unknown" ? "UNKNOWN" : "SUBMITTED"} WHERE id=${row.id}`;
      return reschedule(connection, job);
    }
    if (status.state === "failed" || !status.transactionHash) return needsAttention(connection, job, row, "Provider status is not onchain proof of a failed transfer");
    try {
      const receipt = await createArcClient(process.env.ARC_RPC_URL).getTransactionReceipt({ hash: status.transactionHash });
      const movement = verifyErc20Transfer(receipt, { token: token.address, from: row.wallet_address, to: row.destination_address, amount: BigInt(row.amount_atomic) });
      await connection`UPDATE withdrawals SET state='CONFIRMED',receipt_reference=${connection.json(movement)} WHERE id=${row.id}`;
      await connection`UPDATE trading_wallets SET operating_mode='frozen' WHERE id=${row.wallet_id}`;
      await finish(connection, job);
    } catch {
      await connection`UPDATE withdrawals SET state='UNKNOWN' WHERE id=${row.id}`;
      await connection`UPDATE trading_wallets SET operating_mode='frozen' WHERE id=${row.wallet_id}`;
      await reschedule(connection, job);
    }
  });
}

async function needsAttention(sql: Sql<Record<string, never>>, job: Job, row: WithdrawalRow, reason: string) {
  await sql`UPDATE withdrawals SET state='NEEDS_ATTENTION' WHERE id=${row.id}`;
  await sql`UPDATE trading_wallets SET operating_mode='frozen' WHERE id=${row.wallet_id}`;
  await sql`INSERT INTO audit_events (actor,action,target,correlation_id,metadata) VALUES ('worker','withdrawal_needs_attention',${row.id},${job.id},${sql.json({ reason })})`;
  await finish(sql, job);
}
async function reschedule(sql: Sql<Record<string, never>>, job: Job) { await sql`UPDATE jobs SET lease_owner=NULL,lease_expires_at=NULL,scheduled_at=now()+interval '15 seconds' WHERE id=${job.id} AND fencing_token=${job.fencing_token}`; }
async function finish(sql: Sql<Record<string, never>>, job: Job) { await sql`UPDATE jobs SET terminal=true WHERE id=${job.id} AND fencing_token=${job.fencing_token} AND lease_owner=${job.lease_owner}`; }
