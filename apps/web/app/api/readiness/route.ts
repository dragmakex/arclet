import { authenticateRequest } from "../../../lib/auth";
import { safeApiError } from "../../../lib/http";
import { capabilityStatus } from "../../../../../config/runtime";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { try { await authenticateRequest(request); return Response.json(capabilityStatus()); } catch (error) { return safeApiError(error); } }
