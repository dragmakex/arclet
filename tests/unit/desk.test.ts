import { describe, expect, it } from "vitest";
import { checkedFacts, decisionLabel, normalizeSnapshots, usdcInputToAtomic, usdcLinePath } from "../../apps/web/lib/desk";

describe("desk data transformation", () => {
  it("drops malformed persisted balances and keeps exact atomic strings", () => {
    expect(normalizeSnapshots([
      { observed_at: "2026-09-12T00:00:00.000Z", usdc_atomic: "1000000" },
      { observed_at: "2026-09-12T00:01:00.000Z", usdc_atomic: "-1" },
      { observed_at: "2026-09-12T00:02:00.000Z", usdc_atomic: null }
    ])).toEqual([{ observedAt: "2026-09-12T00:00:00.000Z", usdcAtomic: "1000000" }]);
  });

  it("keeps an empty chart empty instead of inventing a trend", () => {
    expect(usdcLinePath([])).toBeNull();
    expect(usdcLinePath([{ observedAt: "2026-09-12T00:00:00.000Z", usdcAtomic: "1000000" }])).toBeNull();
  });

  it("draws only a normalized visual path for real persisted values", () => {
    expect(usdcLinePath([
      { observedAt: "2026-09-12T00:00:00.000Z", usdcAtomic: "1000000" },
      { observedAt: "2026-09-12T00:01:00.000Z", usdcAtomic: "2000000" }
    ])).toBe("M0.00,180.00 L640.00,0.00");
  });

  it("parses user funding amounts into exact USDC atomic units", () => {
    expect(usdcInputToAtomic("1")).toBe("1000000");
    expect(usdcInputToAtomic("1.000001")).toBe("1000001");
    expect(usdcInputToAtomic("0")).toBeNull();
    expect(usdcInputToAtomic("1.0000001")).toBeNull();
  });

  it("renders structured policy facts without model reasoning", () => {
    expect(checkedFacts([{ code: "DATA_STALE", fact: "source block age exceeds the mandate limit", passed: false }]))
      .toEqual(["DATA_STALE: source block age exceeds the mandate limit"]);
    expect(decisionLabel({ result: "EXECUTE", executionState: "CONFIRMED" })).toBe("CONFIRMED");
    expect(decisionLabel({ result: "HOLD", executionState: null })).toBe("HOLD");
  });
});
