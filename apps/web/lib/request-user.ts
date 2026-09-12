import { authenticateRequest } from "./auth";
import { ensureUser } from "./repository";
export async function authenticatedDatabaseUser(request: Request) { const identity = await authenticateRequest(request); const user = await ensureUser(identity); return { identity, user }; }
