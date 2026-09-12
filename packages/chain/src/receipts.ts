import { decodeEventLog, getAddress, type TransactionReceipt } from "viem";
import { erc20Abi } from "./tokens";
export type ReconciledSwapMovement = { transactionHash: `0x${string}`; inputAtomic: bigint; outputAtomic: bigint; inputLogIndex: number; outputLogIndex: number };
export function reconcileSwapReceipt(receipt: TransactionReceipt, expected: { wallet: string; inputToken: string; outputToken: string; inputAtomic: bigint }): ReconciledSwapMovement {
  if (receipt.status !== "success") throw new Error("Swap receipt is not successful");
  const wallet=getAddress(expected.wallet),inputToken=getAddress(expected.inputToken),outputToken=getAddress(expected.outputToken);let input: {amount:bigint;index:number}|undefined,output:{amount:bigint;index:number}|undefined;
  for(const log of receipt.logs){try{const decoded=decodeEventLog({abi:erc20Abi,data:log.data,topics:log.topics});if(decoded.eventName!=="Transfer")continue;const args=decoded.args,address=getAddress(log.address);if(address===inputToken&&getAddress(args.from)===wallet&&args.value===expected.inputAtomic)input={amount:args.value,index:log.logIndex};if(address===outputToken&&getAddress(args.to)===wallet&&args.value>0n)output={amount:args.value,index:log.logIndex};}catch{continue}}
  if(!input||!output)throw new Error("Receipt does not contain the exact wallet input and positive output movements");
  return {transactionHash:receipt.transactionHash,inputAtomic:input.amount,outputAtomic:output.amount,inputLogIndex:input.index,outputLogIndex:output.index};
}

export function verifyTransactionSender(transaction: { from: string }, expectedSender: string): void {
  if (getAddress(transaction.from) !== getAddress(expectedSender)) throw new Error("Transaction sender does not match the funding intent");
}

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
