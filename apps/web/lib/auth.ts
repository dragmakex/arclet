import { PrivyClient } from "@privy-io/server-auth";
import { getAddress } from "viem";
export type AuthenticatedUser = { privyUserId: string; embeddedWalletAddress: `0x${string}` };
export async function authenticateRequest(request: Request): Promise<AuthenticatedUser> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
  const appId = process.env.PRIVY_APP_ID, secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) throw new Error("AUTH_NOT_CONFIGURED");
  const client = new PrivyClient(appId, secret);
  const claims = await client.verifyAuthToken(auth.slice(7));
  const user = await client.getUser(claims.userId);
  const wallet = user.linkedAccounts.find((account) => account.type === "wallet" && account.chainType === "ethereum" && "walletClientType" in account && account.walletClientType === "privy");
  if (!wallet || !("address" in wallet)) throw new Error("EMBEDDED_WALLET_REQUIRED");
  return { privyUserId: claims.userId, embeddedWalletAddress: getAddress(wallet.address) };
}
