import { getAddress, isAddress } from "viem";
import { z } from "zod";
export const assetIdSchema = z.enum(["USDC", "EURC", "cirBTC"]).brand<"AssetId">();
export type AssetId = z.infer<typeof assetIdSchema>;
export const addressSchema = z.string().refine(isAddress, "Invalid EVM address").transform((value) => getAddress(value)).brand<"Address">();
export type Address = z.infer<typeof addressSchema>;
export const hashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((value) => value as `0x${string}`).brand<"Hash">();
export type Hash = z.infer<typeof hashSchema>;
