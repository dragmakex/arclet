import { z } from "zod";
import { addressSchema, positiveAtomicSchema, atomicSchema } from "@arclet/domain";
const asset = z.enum(["USDC", "EURC", "cirBTC"]);
export const quoteRequestSchema = z.object({
  marketId: z.enum(["usdc-cirbtc", "usdc-eurc"]), chain: z.literal("ARC-TESTNET"), chainId: z.literal(5042002), wallet: addressSchema,
  inputAsset: asset, outputAsset: asset, inputAtomic: positiveAtomicSchema, inputDecimals: z.number().int().min(0).max(36), outputDecimals: z.number().int().min(0).max(36)
}).strict().refine((value) => value.inputAsset !== value.outputAsset && (value.inputAsset === "USDC" || value.outputAsset === "USDC"), "Quote must be an approved USDC market direction").refine((value) => value.marketId === "usdc-cirbtc" ? [value.inputAsset,value.outputAsset].includes("cirBTC") : [value.inputAsset,value.outputAsset].includes("EURC"), "Quote assets do not match market");
export const normalizedQuoteSchema = z.object({
  marketId: z.enum(["usdc-cirbtc", "usdc-eurc"]), chain: z.literal("ARC-TESTNET"), chainId: z.literal(5042002), wallet: addressSchema,
  inputAsset: asset, outputAsset: asset, inputAtomic: positiveAtomicSchema, outputAtomic: positiveAtomicSchema,
  inputDecimals: z.number().int().min(0).max(36), outputDecimals: z.number().int().min(0).max(36), createdAt: z.number().int(), expiresAt: z.number().int().optional(),
  feeStatus: z.enum(["known", "unknown"]), feeAtomic: atomicSchema.optional(), providerReference: z.string().optional()
}).strict();
export const verifiedAgentWalletSchema = z.object({ id: z.string().min(1), address: addressSchema, chain: z.literal("ARC-TESTNET"), type: z.literal("agent") }).strict();
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type NormalizedQuote = z.infer<typeof normalizedQuoteSchema>;
export type VerifiedAgentWallet = z.infer<typeof verifiedAgentWalletSchema>;
