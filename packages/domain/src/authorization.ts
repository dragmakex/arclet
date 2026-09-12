import { z } from "zod";
import { bytesToHex, keccak256, toBytes, verifyTypedData } from "viem";
import { addressSchema, hashSchema } from "./assets";

export const mandateApprovalSchema = z.object({
  owner: addressSchema, tradingWallet: addressSchema, strategyId: hashSchema, strategyVersion: z.coerce.bigint().positive(), strategyHash: hashSchema,
  marketConfigHash: hashSchema, nonce: hashSchema, issuedAt: z.coerce.bigint().nonnegative(), expiresAt: z.coerce.bigint().positive()
}).strict().refine((value) => value.expiresAt > value.issuedAt, "Approval must expire after issuance");
export type MandateApproval = z.infer<typeof mandateApprovalSchema>;
export const mandateDomain = (chainId: number, origin: string) => ({ name: "Arclet", version: "1", chainId, salt: keccak256(toBytes(new URL(origin).origin)) }) as const;
export const mandateTypes = { MandateApproval: [
  { name: "owner", type: "address" }, { name: "tradingWallet", type: "address" }, { name: "strategyId", type: "bytes32" }, { name: "strategyVersion", type: "uint64" },
  { name: "strategyHash", type: "bytes32" }, { name: "marketConfigHash", type: "bytes32" }, { name: "nonce", type: "bytes32" }, { name: "issuedAt", type: "uint64" }, { name: "expiresAt", type: "uint64" }
] } as const;
export const strategyIdHash = (strategyId: string) => keccak256(toBytes(strategyId));
export async function verifyMandateSignature(input: { approval: unknown; signature: `0x${string}`; chainId: number; origin: string; expectedOwner: string }) {
  const approval = mandateApprovalSchema.parse(input.approval), expectedOwner = addressSchema.parse(input.expectedOwner);
  if (approval.owner !== expectedOwner) return false;
  return verifyTypedData({ address: expectedOwner, domain: mandateDomain(input.chainId, input.origin), types: mandateTypes, primaryType: "MandateApproval", message: approval, signature: input.signature });
}

export const withdrawalApprovalSchema = z.object({
  owner: addressSchema, tradingWallet: addressSchema, destination: addressSchema, assetId: z.enum(["USDC", "EURC", "cirBTC"]), amountAtomic: z.coerce.bigint().positive(), chainId: z.coerce.bigint().refine((value) => value === 5042002n, "Wrong withdrawal chain"), nonce: hashSchema, issuedAt: z.coerce.bigint().nonnegative(), expiresAt: z.coerce.bigint().positive()
}).strict().refine((value) => value.expiresAt > value.issuedAt, "Withdrawal approval must expire after issuance");
export const withdrawalTypes = { WithdrawalApproval: [
  { name: "owner", type: "address" }, { name: "tradingWallet", type: "address" }, { name: "destination", type: "address" }, { name: "assetId", type: "string" }, { name: "amountAtomic", type: "uint256" }, { name: "chainId", type: "uint256" }, { name: "nonce", type: "bytes32" }, { name: "issuedAt", type: "uint64" }, { name: "expiresAt", type: "uint64" }
] } as const;
export async function verifyWithdrawalSignature(input: { approval: unknown; signature: `0x${string}`; origin: string; expectedOwner: string }) {
  const approval = withdrawalApprovalSchema.parse(input.approval), expectedOwner = addressSchema.parse(input.expectedOwner);
  if (approval.owner !== expectedOwner || approval.destination !== expectedOwner) return false;
  return verifyTypedData({ address: expectedOwner, domain: mandateDomain(Number(approval.chainId), input.origin), types: withdrawalTypes, primaryType: "WithdrawalApproval", message: approval, signature: input.signature });
}

export function randomNonce(): `0x${string}` { return bytesToHex(crypto.getRandomValues(new Uint8Array(32))); }
