"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
export function Providers({ children, appId }: { children: ReactNode; appId?: string }) { if (!appId) return children; return <PrivyProvider appId={appId} config={{ loginMethods: ["email"], embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } } }}>{children}</PrivyProvider>; }
