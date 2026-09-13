"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { checkedFacts, decisionLabel, type ConfirmedReceipt, type DeskEntry } from "../lib/desk";

type ActivityEntry = DeskEntry & { receipts: ConfirmedReceipt[] };

function shortHash(hash: string) { return `${hash.slice(0, 8)}…${hash.slice(-4)}`; }

export function ActivityClient() {
  const { authenticated, getAccessToken, login, ready } = usePrivy();
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [status, setStatus] = useState("Sign in to inspect your tenant-scoped activity archive.");

  const load = useCallback(async () => {
    if (!authenticated) return;
    const token = await getAccessToken();
    if (!token) { setStatus("A Privy access token is unavailable."); return; }
    const response = await fetch("/api/activity", { headers: { Authorization: `Bearer ${token}` } });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || !body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) { setStatus("Activity records are unavailable."); return; }
    setItems((body as { items: ActivityEntry[] }).items);
    setStatus("Showing persisted decisions and reconciled receipts only.");
  }, [authenticated, getAccessToken]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  return <div className="stack"><div className="section-heading"><div><p className="kicker">Archive</p><h1>Activity and evidence</h1></div>{authenticated ? <button className="text-button" type="button" onClick={() => void load()}>Refresh archive</button> : ready ? <button type="button" onClick={login}>Sign in to inspect activity</button> : null}</div><p className="muted" role="status">{status}</p><section className="panel"><h2>Recent decisions</h2>{items.length ? <ol className="trade-ledger">{items.map((item) => <li key={item.id}><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time><strong>{decisionLabel(item)}</strong><span>{checkedFacts(item.reasons).join("; ") || "No structured policy facts were recorded."}<details className="evidence"><summary>Inspect evidence</summary><div className="evidence-body"><h3>All checked facts</h3><ol className="facts">{checkedFacts(item.reasons).map((fact) => <li key={fact}>{fact}</li>)}</ol><h3>Confirmed receipts</h3>{item.receipts?.length ? <ul className="receipt-links">{item.receipts.map((receipt) => <li key={receipt.transactionHash}><a href={`https://testnet.arcscan.app/tx/${receipt.transactionHash}`} target="_blank" rel="noreferrer">{shortHash(receipt.transactionHash)} on Arcscan</a></li>)}</ul> : <p>No receipt link until chain reconciliation succeeds.</p>}</div></details></span></li>)}</ol> : <div className="empty">No decisions or transactions have been recorded for this user.</div>}</section><section className="grid"><article className="panel"><h2>Source network</h2><p>Graph source, deployment, pool, and block appear inside each persisted decision evidence record.</p></article><article className="panel"><h2>Execution network</h2><p>Arc Testnet receipts link only after successful reconciliation. A provider acceptance is not a confirmation.</p></article></section></div>;
}
