import { z } from "zod";
import { addressSchema, hashSchema } from "./assets";
export const mandateApprovalSchema = z.object({
  owner: addressSchema, tradingWallet: addressSchema, strategyId: hashSchema, strategyVersion: z.coerce.bigint().positive(), strategyHash: hashSchema,
  marketConfigHash: hashSchema, nonce: hashSchema, issuedAt: z.coerce.bigint().nonnegative(), expiresAt: z.coerce.bigint().positive()
}).strict().refine((value) => value.expiresAt > value.issuedAt, "Approval must expire after issuance");
export const mandateDomain = (chainId: number, origin: string) => ({ name: "Arclet", version: "1", chainId, salt: hashOrigin(origin) }) as const;
import { keccak256, toBytes } from "viem";
function hashOrigin(origin: string) { return keccak256(toBytes(new URL(origin).origin)); }
export const mandateTypes = { MandateApproval: [
  { name: "owner", type: "address" }, { name: "tradingWallet", type: "address" }, { name: "strategyId", type: "bytes32" }, { name: "strategyVersion", type: "uint64" },
  { name: "strategyHash", type: "bytes32" }, { name: "marketConfigHash", type: "bytes32" }, { name: "nonce", type: "bytes32" }, { name: "issuedAt", type: "uint64" }, { name: "expiresAt", type: "uint64" }
] } as const;
