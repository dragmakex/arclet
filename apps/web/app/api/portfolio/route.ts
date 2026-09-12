import { authenticateRequest } from "../../../lib/auth";
import { safeApiError, apiError } from "../../../lib/http";
export async function GET(request: Request) { try { await authenticateRequest(request); return apiError("DEPENDENCY_UNAVAILABLE", "Portfolio reconciliation requires PostgreSQL and a verified assigned Circle wallet.", 503, true); } catch (error) { return safeApiError(error); } }
