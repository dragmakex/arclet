import Decimal from "decimal.js";
import { z } from "zod";

const ExactDecimal = Decimal.clone({ precision: 100, rounding: Decimal.ROUND_DOWN });

export const atomicSchema = z.string().regex(/^(0|[1-9]\d*)$/, "Expected a non-negative base-unit integer").brand<"Atomic">();
export type Atomic = z.infer<typeof atomicSchema>;
export const positiveAtomicSchema = atomicSchema.refine((value) => BigInt(value) > 0n, "Amount must be positive");

export function atomic(value: string | bigint): Atomic {
  return atomicSchema.parse(value.toString());
}
export function addAtomic(a: Atomic, b: Atomic): Atomic { return atomic(BigInt(a) + BigInt(b)); }
export function subtractAtomic(a: Atomic, b: Atomic): Atomic {
  const result = BigInt(a) - BigInt(b);
  if (result < 0n) throw new Error("Atomic amount cannot become negative");
  return atomic(result);
}
export function nativeUsdcToErc20(nativeAtomic18: string): Atomic { return atomic(BigInt(atomicSchema.parse(nativeAtomic18)) / 1_000_000_000_000n); }
export function erc20UsdcToNative(erc20Atomic6: string): Atomic { return atomic(BigInt(atomicSchema.parse(erc20Atomic6)) * 1_000_000_000_000n); }
export function minimumOutput(quotedOut: string, slippageBps: number): Atomic {
  const quote = BigInt(positiveAtomicSchema.parse(quotedOut));
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= 10_000) throw new Error("Invalid slippage basis points");
  const result = quote * BigInt(10_000 - slippageBps) / 10_000n;
  if (result <= 0n) throw new Error("Minimum output must be positive");
  return atomic(result);
}
export function decimalToAtomic(value: string, decimals: number): Atomic {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) throw new Error("Invalid token decimals");
  const parsed = new ExactDecimal(value);
  if (!parsed.isFinite() || parsed.isNegative()) throw new Error("Invalid decimal amount");
  const scaled = parsed.mul(new ExactDecimal(10).pow(decimals));
  if (!scaled.isInteger()) throw new Error("Amount has too many decimal places");
  return atomic(scaled.toFixed(0));
}
export function atomicToDecimal(value: Atomic, decimals: number): string {
  return new ExactDecimal(value).div(new ExactDecimal(10).pow(decimals)).toFixed(decimals).replace(/\.?0+$/, "");
}
