import { z } from "zod";
export const executionStateSchema = z.enum(["EVALUATING", "HOLD", "QUOTED", "RESERVED", "SUBMITTING", "SUBMITTED", "CONFIRMED", "FAILED", "UNKNOWN", "CANCELLED"]);
export type ExecutionState = z.infer<typeof executionStateSchema>;
const allowed: Record<ExecutionState, readonly ExecutionState[]> = {
 EVALUATING: ["HOLD", "QUOTED"], HOLD: [], QUOTED: ["RESERVED", "CANCELLED"], RESERVED: ["SUBMITTING", "CANCELLED"], SUBMITTING: ["SUBMITTED", "UNKNOWN"], SUBMITTED: ["CONFIRMED", "FAILED", "UNKNOWN"], CONFIRMED: [], FAILED: [], UNKNOWN: ["CONFIRMED", "FAILED"], CANCELLED: []
};
export function assertExecutionTransition(from: ExecutionState, to: ExecutionState): void { if (!allowed[from].includes(to)) throw new Error(`Invalid execution transition: ${from} -> ${to}`); }
