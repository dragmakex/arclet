import type { StrategySpec } from "@arclet/domain";

export function utcDay(epochSeconds: number): string { return new Date(epochSeconds * 1000).toISOString().slice(0, 10); }
export function currentScheduleWindow(startAt: number, everySeconds: number, now: number): number | null { return now < startAt ? null : Math.floor((now - startAt) / everySeconds); }

/**
 * Return the next evaluation time without accumulating missed schedule windows.
 * Conditional mandates are polled by the persistent worker at a bounded cadence.
 */
export function nextEvaluationAt(strategy: StrategySpec, now: number, conditionalPollSeconds = 15): number {
  if (strategy.trigger.type !== "schedule") return now + conditionalPollSeconds;
  if (now < strategy.trigger.startAt) return strategy.trigger.startAt;
  const window = currentScheduleWindow(strategy.trigger.startAt, strategy.trigger.everySeconds, now);
  return strategy.trigger.startAt + ((window ?? 0) + 1) * strategy.trigger.everySeconds;
}
