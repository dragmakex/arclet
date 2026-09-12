"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { defineChain } from "viem";
const arcTestnet=defineChain({id:5042002,name:"Arc Testnet",nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},rpcUrls:{default:{http:["https://rpc.testnet.arc.io"]}},blockExplorers:{default:{name:"Arcscan",url:"https://testnet.arcscan.app"}},testnet:true});
export function Providers({ children, appId }: { children: ReactNode; appId?: string }) { if (!appId) return children; return <PrivyProvider appId={appId} config={{ loginMethods: ["email"], defaultChain:arcTestnet, supportedChains:[arcTestnet], embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } } }}>{children}</PrivyProvider>; }
