import { describe, expect, it } from "vitest";
import { canSubmitReserved } from "../../apps/worker/src/submit-job";
import { stateAfterUnprovenProviderFailure } from "../../apps/worker/src/reconcile-job";
import { hasSufficientWithdrawalBalances } from "../../apps/worker/src/withdrawal-job";

describe("worker submission fencing", () => {
  it("refuses a reserved execution after pause/epoch change or lease loss", () => {
    expect(canSubmitReserved({ executionState: "RESERVED", strategyState: "ACTIVE", executionEpoch: "4", strategyEpoch: "4", activeLease: true })).toBe(true);
    expect(canSubmitReserved({ executionState: "RESERVED", strategyState: "PAUSED", executionEpoch: "4", strategyEpoch: "5", activeLease: true })).toBe(false);
    expect(canSubmitReserved({ executionState: "RESERVED", strategyState: "ACTIVE", executionEpoch: "4", strategyEpoch: "4", activeLease: false })).toBe(false);
  });

  it("retains an ambiguous provider failure as UNKNOWN for reconciliation", () => {
    expect(stateAfterUnprovenProviderFailure()).toBe("UNKNOWN");
  });

  it("requires refreshed token funds and an Arc native-USDC gas buffer before a withdrawal", () => {
    const native = 1_100_000n * 1_000_000_000_000n;
    expect(hasSufficientWithdrawalBalances({ asset: "USDC", amountAtomic: 1_000_000n, tokenBalance: 1_000_000n, nativeUsdcAtomic18: native })).toBe(true);
    expect(hasSufficientWithdrawalBalances({ asset: "USDC", amountAtomic: 1_000_000n, tokenBalance: 1_000_000n, nativeUsdcAtomic18: 1_000_000n * 1_000_000_000_000n })).toBe(false);
  });
});
