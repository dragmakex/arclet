export type ArcletErrorCode = "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE" | "DATA_STALE" | "UNSUPPORTED_MARKET";
export class ArcletError extends Error { constructor(public readonly code: ArcletErrorCode, message: string, public readonly retryable = false) { super(message); } }
