import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";
export const metadata: Metadata = { title: "Arclet", description: "Signed trading mandates with inspectable onchain evidence" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const appId=process.env.NEXT_PUBLIC_PRIVY_APP_ID; return <html lang="en"><body><Providers {...(appId ? { appId } : {})}><div className="environment">Arc Testnet - no real monetary value</div><header><Link className="brand" href="/">arclet</Link><nav aria-label="Primary"><Link href="/wallet">Wallet</Link><Link href="/activity">Activity</Link><Link href="/settings">Setup</Link></nav></header><main>{children}</main><footer>Application-operated trading wallet. Policy limits are enforced by Arclet, not by an onchain contract.</footer></Providers></body></html>; }
