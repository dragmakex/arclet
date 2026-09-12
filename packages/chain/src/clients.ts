import { createPublicClient, defineChain, http } from "viem";
export const arcTestnet = defineChain({ id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } }, blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } }, testnet: true });
export function createArcClient(rpcUrl = "https://rpc.testnet.arc.io") { return createPublicClient({ chain: arcTestnet, transport: http(rpcUrl, { timeout: 10_000 }) }); }
