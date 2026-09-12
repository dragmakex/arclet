import { authenticateRequest } from "../../../lib/auth";
import { safeApiError } from "../../../lib/http";
export async function GET(request: Request) { try { await authenticateRequest(request); return Response.json({ items: [], nextCursor: null, note: "No activity exists for this verified user." }); } catch (error) { return safeApiError(error); } }
