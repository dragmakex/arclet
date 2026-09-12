import { randomUUID } from "node:crypto";
import { atomicToDecimal, addressSchema, atomicSchema, minimumOutput } from "@arclet/domain";
import { z } from "zod";
import { normalizedQuoteSchema, quoteRequestSchema, verifiedAgentWalletSchema, type NormalizedQuote, type QuoteRequest, type VerifiedAgentWallet } from "./schemas";
import { RestrictedProcessRunner } from "./process-runner";

export type AdapterHealth = { healthy: boolean; reason?: string };
export type SubmissionReference = { providerId?: string; transactionHash?: `0x${string}`; idempotencyKey?: string; state: "accepted" | "submitted" | "unknown" };
export type ExecutionStatus = { state: "pending" | "confirmed" | "failed" | "unknown"; transactionHash?: `0x${string}` };
export type AuthorizedSwap = { quote: NormalizedQuote; minimumOutputAtomic: string; slippageBps: number; idempotencyKey: string };
export type AuthorizedWithdrawal = { chain: "ARC-TESTNET"; wallet: `0x${string}`; destination: `0x${string}`; asset: "USDC" | "EURC" | "cirBTC"; amountAtomic: string; decimals: number };
export interface CircleTradingAdapter {
  health(): Promise<AdapterHealth>;
  listWallets(): Promise<VerifiedAgentWallet[]>;
  quote(request: QuoteRequest): Promise<NormalizedQuote>;
  submitSwap(request: AuthorizedSwap): Promise<SubmissionReference>;
  submitTransfer(request: AuthorizedWithdrawal): Promise<SubmissionReference>;
  reconcile(reference: SubmissionReference, wallet: `0x${string}`): Promise<ExecutionStatus>;
}

export function buildQuoteArgs(raw: QuoteRequest): string[] {
  const request = quoteRequestSchema.parse(raw);
  return ["wallet", "swap", request.inputAsset, atomicToDecimal(request.inputAtomic, request.inputDecimals), request.outputAsset, "--chain", request.chain, "--address", request.wallet, "--quote", "--output", "json"];
}
export function buildSwapArgs(raw: AuthorizedSwap): string[] {
  const quote = normalizedQuoteSchema.parse(raw.quote);
  const minimumOutputAtomic = atomicSchema.parse(raw.minimumOutputAtomic);
  if (!Number.isInteger(raw.slippageBps) || raw.slippageBps < 1 || raw.slippageBps > 100) throw new Error("Invalid slippage");
  if (minimumOutput(quote.outputAtomic, raw.slippageBps) !== minimumOutputAtomic) throw new Error("Minimum output is not derived from the bound quote");
  const idempotencyKey = z.string().uuid().parse(raw.idempotencyKey);
  const minimumOutputDecimal = atomicToDecimal(minimumOutputAtomic, quote.outputDecimals);
  return ["wallet", "swap", quote.inputAsset, atomicToDecimal(quote.inputAtomic, quote.inputDecimals), quote.outputAsset, minimumOutputDecimal, "--address", quote.wallet, "--chain", quote.chain, "--slippage-bps", String(raw.slippageBps), "--idempotency-key", idempotencyKey, "--output", "json"];
}
export function buildTransferArgs(raw: AuthorizedWithdrawal): string[] {
  const wallet = addressSchema.parse(raw.wallet), destination = addressSchema.parse(raw.destination), amount = atomicSchema.parse(raw.amountAtomic);
  if (BigInt(amount) <= 0n || !Number.isInteger(raw.decimals) || raw.decimals < 0 || raw.decimals > 36) throw new Error("Invalid transfer amount or decimals");
  if (!(raw.asset === "USDC" || raw.asset === "EURC" || raw.asset === "cirBTC")) throw new Error("Unsupported transfer asset");
  return ["wallet", "transfer", raw.asset, atomicToDecimal(amount, raw.decimals), "--to", destination, "--address", wallet, "--chain", raw.chain, "--output", "json"];
}

export class CircleCliAdapter implements CircleTradingAdapter {
  constructor(private readonly runner: RestrictedProcessRunner) {}
  async health(): Promise<AdapterHealth> { const result = await this.runner.run(["--version"]); return result.exitCode === 0 && !result.timedOut && !result.overflowed ? { healthy: true } : { healthy: false, reason: "CLI failed, timed out, or exceeded output limits" }; }
  async listWallets(): Promise<VerifiedAgentWallet[]> {
    const result = await this.runner.run(["wallet", "list", "--type", "agent", "--chain", "ARC-TESTNET", "--output", "json"]);
    if (result.exitCode !== 0 || result.timedOut || result.overflowed) throw new Error("Circle Agent Wallet listing failed");
    const parsed: unknown = JSON.parse(result.stdout), wallets = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && "wallets" in parsed ? parsed.wallets : null;
    return z.array(verifiedAgentWalletSchema).parse(wallets);
  }
  async quote(request: QuoteRequest): Promise<NormalizedQuote> {
    const normalizedRequest = quoteRequestSchema.parse(request), result = await this.runner.run(buildQuoteArgs(normalizedRequest));
    if (result.exitCode !== 0 || result.timedOut || result.overflowed) throw new Error("Circle quote failed");
    return normalizeQuote(result.stdout, normalizedRequest);
  }
  async submitSwap(request: AuthorizedSwap): Promise<SubmissionReference> {
    const idempotencyKey = z.string().uuid().parse(request.idempotencyKey);
    const result = await this.runner.run(buildSwapArgs(request));
    if (result.exitCode !== 0 || result.timedOut || result.overflowed) return { idempotencyKey, state: "unknown" };
    try { return normalizeSubmission(result.stdout, idempotencyKey); } catch { return { idempotencyKey, state: "unknown" }; }
  }
  async submitTransfer(request: AuthorizedWithdrawal): Promise<SubmissionReference> {
    const result = await this.runner.run(buildTransferArgs(request));
    if (result.exitCode !== 0 || result.timedOut || result.overflowed) return { state: "unknown" };
    try { return normalizeSubmission(result.stdout); } catch { return { state: "unknown" }; }
  }
  async reconcile(reference: SubmissionReference, wallet: `0x${string}`): Promise<ExecutionStatus> {
    const result = await this.runner.run(["transaction", "list", "--address", addressSchema.parse(wallet), "--chain", "ARC-TESTNET", "--output", "json"]);
    if (result.exitCode !== 0 || result.timedOut || result.overflowed) return { state: "unknown" };
    try {
      const raw: unknown = JSON.parse(result.stdout), list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && "transactions" in raw && Array.isArray(raw.transactions) ? raw.transactions : [];
      const found = list.find((item) => item && typeof item === "object" && ((reference.providerId && "id" in item && item.id === reference.providerId) || (reference.transactionHash && "transactionHash" in item && item.transactionHash === reference.transactionHash)));
      if (!found || typeof found !== "object") return { state: "unknown" };
      const status = "status" in found && typeof found.status === "string" ? found.status.toLowerCase() : "unknown";
      const hash = "transactionHash" in found && typeof found.transactionHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(found.transactionHash) ? found.transactionHash as `0x${string}` : undefined;
      if (["confirmed", "complete", "completed", "success"].includes(status)) return hash ? { state: "confirmed", transactionHash: hash } : { state: "confirmed" };
      if (["failed", "rejected"].includes(status)) return hash ? { state: "failed", transactionHash: hash } : { state: "failed" };
      return hash ? { state: "pending", transactionHash: hash } : { state: "pending" };
    } catch { return { state: "unknown" }; }
  }
}

function normalizeQuote(stdout: string, request: QuoteRequest): NormalizedQuote {
  const raw: unknown = JSON.parse(stdout);
  if (!raw || typeof raw !== "object") throw new Error("Malformed Circle quote");
  const output = "outputAtomic" in raw && typeof raw.outputAtomic === "string" ? raw.outputAtomic : null;
  if (!output) throw new Error("Circle quote omitted outputAtomic; update the adapter from a sanitized pinned-version fixture");
  const createdAt = "createdAt" in raw && typeof raw.createdAt === "number" ? raw.createdAt : Math.floor(Date.now() / 1000);
  const optional = "expiresAt" in raw && typeof raw.expiresAt === "number" ? { expiresAt: raw.expiresAt } : {};
  const provider = "id" in raw && typeof raw.id === "string" ? { providerReference: raw.id } : {};
  return normalizedQuoteSchema.parse({ ...request, outputAtomic: output, createdAt, feeStatus: "unknown", ...optional, ...provider });
}
function normalizeSubmission(stdout: string, idempotencyKey?: string): SubmissionReference {
  const raw: unknown = JSON.parse(stdout);
  if (!raw || typeof raw !== "object") throw new Error("Malformed Circle submission");
  const providerId = "id" in raw && typeof raw.id === "string" ? raw.id : undefined;
  const transactionHash = "transactionHash" in raw && typeof raw.transactionHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(raw.transactionHash) ? raw.transactionHash as `0x${string}` : undefined;
  if (!providerId && !transactionHash) throw new Error("Circle submission omitted a reference");
  return { ...(providerId ? { providerId } : {}), ...(transactionHash ? { transactionHash } : {}), ...(idempotencyKey ? { idempotencyKey } : {}), state: transactionHash ? "submitted" : "accepted" };
}
export const createIdempotencyKey = () => randomUUID();
