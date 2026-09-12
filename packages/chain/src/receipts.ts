import { decodeEventLog, getAddress, type TransactionReceipt } from "viem";
import { erc20Abi } from "./tokens";
export function verifyErc20Transfer(receipt: TransactionReceipt, expected: { token: string; from: string; to: string; amount: bigint }): { transactionHash: `0x${string}`; logIndex: number } {
  if (receipt.status !== "success") throw new Error("Transaction receipt is not successful");
  const token = getAddress(expected.token), from = getAddress(expected.from), to = getAddress(expected.to);
  const matches = receipt.logs.flatMap((log) => {
    if (getAddress(log.address) !== token) return [];
    try { const decoded = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics }); if (decoded.eventName !== "Transfer") return []; const args = decoded.args; return getAddress(args.from) === from && getAddress(args.to) === to && args.value === expected.amount ? [{ transactionHash: receipt.transactionHash, logIndex: log.logIndex }] : []; } catch { return []; }
  });
  if (matches.length !== 1) throw new Error(`Expected exactly one matching ERC-20 Transfer log, found ${matches.length}`);
  return matches[0]!;
}
