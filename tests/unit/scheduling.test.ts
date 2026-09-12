import { describe, expect, it } from "vitest";
import { strategySpecSchema } from "@arclet/domain";
import { nextEvaluationAt } from "@arclet/policy";
import { spec } from "./strategy.test";

describe("persistent evaluation scheduling", () => {
  it("advances DCA to the next slot without catch-up bursts", () => {
    const strategy = strategySpecSchema.parse(spec);
    const now = strategy.trigger.type === "schedule" ? strategy.trigger.startAt + strategy.trigger.everySeconds * 8 + 22 : 0;
    expect(nextEvaluationAt(strategy, now)).toBe(strategy.trigger.type === "schedule" ? strategy.trigger.startAt + strategy.trigger.everySeconds * 9 : 0);
  });

  it("polls conditional mandates on a bounded cadence", () => {
    const strategy = strategySpecSchema.parse({ ...spec, type: "conditional", trigger: { type: "reference_price", comparator: "lte", priceUsdc: "1" } });
    expect(nextEvaluationAt(strategy, 100, 15)).toBe(115);
  });
});
