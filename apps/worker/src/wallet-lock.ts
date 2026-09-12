import type { ReservedSql, Sql } from "postgres";
function lockId(walletId: string): string { let hash = 0n; for (const byte of new TextEncoder().encode(walletId)) hash = BigInt.asIntN(63, hash * 31n + BigInt(byte)); return hash.toString(); }
export async function withWalletLock<T>(sql: Sql<Record<string, never>>, walletId: string, work: (connection: ReservedSql<Record<string, never>>) => Promise<T>): Promise<T> {
  const connection = await sql.reserve(), id = lockId(walletId);
  try {
    const rows = await connection<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(${id}) AS locked`;
    if (!rows[0]?.locked) throw new Error("Wallet mutation lock is held by another worker");
    try { return await work(connection); }
    finally { await connection`SELECT pg_advisory_unlock(${id})`; }
  } finally { connection.release(); }
}
