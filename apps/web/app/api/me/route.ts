import { assignedWallet } from "../../../lib/repository";
import { authenticatedDatabaseUser } from "../../../lib/request-user";
import { safeApiError } from "../../../lib/http";

/** Returns only the authenticated user's linked personal and assigned trading wallet. */
export async function GET(request: Request) {
  try {
    const { identity, user } = await authenticatedDatabaseUser(request);
    const wallet = await assignedWallet(user.id);
    return Response.json({
      user: { id: user.id, accessStatus: user.access_status },
      personalWallet: identity.embeddedWalletAddress,
      tradingWallet: wallet ? { address: wallet.address, chainId: 5042002, custody: "application-operated" } : null
    });
  } catch (error) {
    return safeApiError(error);
  }
}
