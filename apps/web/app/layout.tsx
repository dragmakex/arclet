import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arclet Financial Desk",
  description: "Signed trading mandates with inspectable onchain evidence"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  return <html lang="en"><body><Providers {...(appId ? { appId } : {})}>
    <div className="environment">ARC TESTNET / NO REAL MONETARY VALUE / APPLICATION LIMITS ARE NOT ONCHAIN GUARANTEES</div>
    <header><Link className="brand" href="/wallet">ARCLET</Link><nav aria-label="Primary"><Link href="/wallet">Desk</Link><Link href="/activity">Archive</Link><Link href="/settings">Setup</Link></nav></header>
    <main>{children}</main>
    <footer>Personal wallet: Privy-controlled. Trading wallet: application-operated Circle Agent Wallet. A signed mandate authorizes Arclet, not an onchain spending-control contract.</footer>
  </Providers></body></html>;
}
