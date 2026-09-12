import { z } from "zod";
import { addressSchema, positiveAtomicSchema, atomicSchema } from "@arclet/domain";
export const quoteRequestSchema = z.object({ chain: z.literal("ARC-TESTNET"), wallet: addressSchema, inputAsset: z.enum(["USDC", "EURC", "cirBTC"]), outputAsset: z.enum(["USDC", "EURC", "cirBTC"]), inputAtomic: positiveAtomicSchema, inputDecimals: z.number().int().min(0).max(36) }).strict().refine((value) => value.inputAsset !== value.outputAsset, "Quote assets must differ");
export const normalizedQuoteSchema = z.object({ inputAsset: z.string(), outputAsset: z.string(), inputAtomic: positiveAtomicSchema, outputAtomic: positiveAtomicSchema, createdAt: z.number().int(), expiresAt: z.number().int().optional(), feeStatus: z.enum(["known", "unknown"]), feeAtomic: atomicSchema.optional(), providerReference: z.string().optional() }).strict();
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type NormalizedQuote = z.infer<typeof normalizedQuoteSchema>;
