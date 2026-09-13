"use client";
import { useState } from "react";
import { usePrivy, useSendTransaction, useSignTypedData, type SignTypedDataParams } from "@privy-io/react-auth";
import { createPublicClient, http } from "viem";
import { usdcInputToAtomic } from "../lib/desk";
import { LoadingIndicator } from "./loading-indicator";

type Request = (path: string, init?: RequestInit) => Promise<unknown>;
export function WalletControls({ request, refresh, tradingAddress }: { request: Request; refresh: () => Promise<void>; tradingAddress?: string }) {
  const { user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { signTypedData } = useSignTypedData();
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<{ id: string; hash: `0x${string}` } | null>(null);
  const wallet = user?.linkedAccounts.find((a) => a.type === "wallet" && a.chainType === "ethereum" && a.walletClientType === "privy");
  const personalAddress = wallet && "address" in wallet ? wallet.address : undefined;
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try { await action(); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Wallet request failed"); }
    finally { setBusy(false); }
  }
  function atomicAmount() {
    const value = usdcInputToAtomic(amount);
    if (!value) throw new Error("Enter a positive USDC amount with at most six decimals.");
    return value;
  }
  async function confirmFunding(value: { id: string; hash: `0x${string}` }) {
    await createPublicClient({ transport: http("https://rpc.testnet.arc.io") }).waitForTransactionReceipt({ hash: value.hash, timeout: 60_000 });
    await request(`/api/funding-intents/${value.id}/confirm`, { method: "POST", body: JSON.stringify({ transactionHash: value.hash }) });
    setPending(null);
    setNotice(`Funding confirmed: ${value.hash}`);
  }
  async function fund() {
    if (!personalAddress) throw new Error("Your embedded wallet is not ready.");
    const intent = await request("/api/funding-intents", { method: "POST", body: JSON.stringify({ amountAtomic: atomicAmount(), chainId: 5042002 }) }) as { id: string; transaction: { chainId: number; to: `0x${string}`; data: `0x${string}`; value: string } };
    const result = await sendTransaction({ chainId: intent.transaction.chainId, to: intent.transaction.to, data: intent.transaction.data, value: BigInt(intent.transaction.value) }, { address: personalAddress });
    const value = { id: intent.id, hash: result.hash };
    setPending(value);
    setNotice(`Transfer submitted: ${result.hash}. Waiting for receipt verification.`);
    await confirmFunding(value);
  }
  async function withdraw() {
    const challenge = await request("/api/withdrawals/challenge", { method: "POST", body: JSON.stringify({ asset: "USDC", amountAtomic: atomicAmount() }) }) as { challengeId: string; domain: unknown; types: unknown; primaryType: string; message: Record<string, unknown> };
    const signed = await signTypedData({ domain: challenge.domain, types: challenge.types, primaryType: challenge.primaryType, message: challenge.message } as unknown as SignTypedDataParams);
    await request("/api/withdrawals", { method: "POST", body: JSON.stringify({ challengeId: challenge.challengeId, signature: signed.signature }) });
    setNotice("Withdrawal queued for the worker. Funds have not been confirmed returned yet.");
  }
  return <section className="panel wallet-controls" aria-label="Testnet wallet controls" aria-busy={busy}>
    <h2>Your wallets · Arc Testnet</h2>
    <p>Personal Privy wallet: {personalAddress ?? "Waiting for embedded wallet"}</p>
    <p>Fund your personal address with Arc Testnet USDC first. Retain USDC for gas.</p>
    <p><a href="https://faucet.circle.com" target="_blank" rel="noreferrer">Get free testnet USDC from Circle’s faucet</a>. Select Arc Testnet and paste your personal wallet address above. These are test tokens, not real money.</p>
    <p>Trading wallet: {tradingAddress ?? "Not assigned"}</p>
    <p>Funding transfers USDC into a separate app-operated Circle wallet. Withdrawals return to your personal wallet. Trading requires your signed approval.</p>
    {!tradingAddress && <button disabled={busy} onClick={() => void run(async () => { await request("/api/trading-wallet/claim", { method: "POST", body: "{}" }); setNotice("Trading wallet assigned."); })}>Assign trading wallet</button>}
    {tradingAddress && <>
      <label htmlFor="wallet-usdc">Amount in testnet USDC</label>
      <input id="wallet-usdc" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} />
      <button disabled={busy || !!pending} onClick={() => void run(fund)}>Sign funding transfer</button>
      <button disabled={busy} onClick={() => void run(withdraw)}>Sign withdrawal request</button>
      {pending && <button disabled={busy} onClick={() => void run(() => confirmFunding(pending))}>Recheck submitted funding</button>}
    </>}
    <p role="status">{busy && <LoadingIndicator label="Processing wallet request…" />}{notice}</p>
  </section>;
}
