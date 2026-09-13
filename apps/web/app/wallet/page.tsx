import { DeskClient } from "../../components/desk-client";
import { DeskUnconfigured } from "../../components/desk-unconfigured";

export const dynamic = "force-dynamic";

/** The primary Arclet workspace. Privy controls are mounted only when configured. */
export default function WalletPage() {
  return process.env.NEXT_PUBLIC_PRIVY_APP_ID ? <DeskClient /> : <DeskUnconfigured />;
}
