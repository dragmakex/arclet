import { NextResponse } from "next/server";
export function apiError(code: string, message: string, status: number, retryable = false) { return NextResponse.json({ error: { code, message, requestId: crypto.randomUUID(), retryable } }, { status }); }
export function requireMutationOrigin(request: Request) { const expected = new URL(process.env.APP_CANONICAL_ORIGIN ?? "http://localhost:3000").origin; if (request.headers.get("origin") !== expected) throw new Error("WRONG_ORIGIN"); return expected; }
export function safeApiError(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "UNAUTHENTICATED") return apiError("UNAUTHORIZED", "A valid Privy bearer token is required.", 401);
  if (code === "AUTH_NOT_CONFIGURED") return apiError("DEPENDENCY_UNAVAILABLE", "Privy server verification is not configured.", 503, true);
  if (code === "DATABASE_NOT_CONFIGURED") return apiError("DEPENDENCY_UNAVAILABLE", "PostgreSQL is not configured.", 503, true);
  if (code === "EMBEDDED_WALLET_REQUIRED") return apiError("FORBIDDEN", "A verified Privy embedded EVM wallet is required.", 403);
  if (code === "USER_NOT_INVITED") return apiError("FORBIDDEN", "This funded demo is restricted to invited users.", 403);
  if (code === "WRONG_ORIGIN") return apiError("FORBIDDEN", "Mutation origin does not match the configured application origin.", 403);
  if (code === "NOT_FOUND") return apiError("NOT_FOUND", "The requested object was not found for this user.", 404);
  if (["STATE_CONFLICT","CHALLENGE_EXPIRED","NONCE_REPLAY","APPROVAL_MISMATCH","RECEIPT_REUSED","INTENT_EXPIRED"].includes(code)) return apiError(code, "The request conflicts with current durable state.", 409);
  if (["INVALID_SIGNATURE","UNSUPPORTED_MARKET","WALLET_REQUIRED","WALLET_CAPACITY","FUNDING_SENDER_MISMATCH"].includes(code)) return apiError(code, code === "WALLET_CAPACITY" ? "No distinct Circle Agent Wallet is available." : "The request failed an authorization or market safety requirement.", code === "WALLET_CAPACITY" ? 409 : 422);
  if (error instanceof SyntaxError) return apiError("VALIDATION", "Request JSON is malformed.", 400);
  return apiError("INTERNAL", "The request could not be completed.", 500, false);
}
