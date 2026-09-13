import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arclet",
  description: "Tell your wallet the rules"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  return <html lang="en"><body><Providers {...(appId ? { appId } : {})}><main>{children}</main></Providers></body></html>;
}
