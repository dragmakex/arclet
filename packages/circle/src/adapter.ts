import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { atomicToDecimal, positiveAtomicSchema } from "@arclet/domain";
import { z } from "zod";
import { quoteRequestSchema, type NormalizedQuote, type QuoteRequest } from "./schemas";
import { RestrictedProcessRunner } from "./process-runner";
export type AdapterHealth = { healthy: boolean; reason?: string };
export type SubmissionReference = { providerId?: string; idempotencyKey: string; state: "accepted" | "submitted" | "unknown" };
export interface CircleTradingAdapter { health(): Promise<AdapterHealth>; quote(request: QuoteRequest): Promise<NormalizedQuote>; submitSwap(request: AuthorizedSwap): Promise<SubmissionReference>; }
export type AuthorizedSwap = QuoteRequest & { minimumOutputDecimal: string; slippageBps: number; idempotencyKey: string };

export function buildQuoteArgs(raw: QuoteRequest): string[] {
  const request = quoteRequestSchema.parse(raw);
  return ["wallet", "swap", request.inputAsset, atomicToDecimal(request.inputAtomic, request.inputDecimals), request.outputAsset, "--chain", request.chain, "--address", request.wallet, "--quote", "--output", "json"];
}
export function buildSwapArgs(raw: AuthorizedSwap): string[] {
  const request = quoteRequestSchema.parse({ chain: raw.chain, wallet: raw.wallet, inputAsset: raw.inputAsset, outputAsset: raw.outputAsset, inputAtomic: raw.inputAtomic, inputDecimals: raw.inputDecimals });
  if (!/^\d+(\.\d+)?$/.test(raw.minimumOutputDecimal) || !new Decimal(raw.minimumOutputDecimal).isPositive()) throw new Error("Invalid minimum output decimal");
  if (!Number.isInteger(raw.slippageBps) || raw.slippageBps < 1 || raw.slippageBps > 100) throw new Error("Invalid slippage");
  const idempotencyKey = z.string().uuid().parse(raw.idempotencyKey);
  return ["wallet", "swap", request.inputAsset, atomicToDecimal(request.inputAtomic, request.inputDecimals), request.outputAsset, raw.minimumOutputDecimal, "--address", request.wallet, "--chain", request.chain, "--slippage-bps", String(raw.slippageBps), "--idempotency-key", idempotencyKey, "--output", "json"];
}

export class CircleCliAdapter implements CircleTradingAdapter {
  constructor(private readonly runner: RestrictedProcessRunner) {}
  async health(): Promise<AdapterHealth> { const result = await this.runner.run(["--version"]); return result.exitCode === 0 ? { healthy: true } : { healthy: false, reason: "CLI returned a nonzero status" }; }
  async quote(request: QuoteRequest): Promise<NormalizedQuote> { const result = await this.runner.run(buildQuoteArgs(request)); if (result.exitCode !== 0) throw new Error("Circle quote failed"); return normalizeQuote(result.stdout, request); }
  async submitSwap(request: AuthorizedSwap): Promise<SubmissionReference> { const result = await this.runner.run(buildSwapArgs(request)); if (result.exitCode !== 0) return { idempotencyKey: request.idempotencyKey, state: "unknown" }; const raw: unknown = JSON.parse(result.stdout); const providerId = typeof raw === "object" && raw && "id" in raw && typeof raw.id === "string" ? raw.id : undefined; return providerId ? { idempotencyKey: request.idempotencyKey, state: "accepted", providerId } : { idempotencyKey: request.idempotencyKey, state: "unknown" }; }
}
function normalizeQuote(stdout: string, request: QuoteRequest): NormalizedQuote { const raw: unknown = JSON.parse(stdout); if (!raw || typeof raw !== "object") throw new Error("Malformed Circle quote"); const output = "outputAtomic" in raw && typeof raw.outputAtomic === "string" ? raw.outputAtomic : null; if (!output) throw new Error("Circle quote omitted outputAtomic; adapter schema requires a captured-version fixture"); return { inputAsset: request.inputAsset, outputAsset: request.outputAsset, inputAtomic: request.inputAtomic, outputAtomic: positiveAtomicSchema.parse(output), createdAt: Math.floor(Date.now()/1000), feeStatus: "unknown" }; }
export const createIdempotencyKey = () => randomUUID();
