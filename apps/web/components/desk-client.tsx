"use client";

import { type SignTypedDataParams, usePrivy, useSignTypedData } from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkedFacts, decisionLabel, usdcLinePath, type DeskEntry, type DeskFeed } from "../lib/desk";

type ApiFailure = { error?: { message?: string } };
type CompileReply =
  | { kind: "needs_clarification"; questions: string[]; unsupportedReasons: string[] }
  | { kind: "draft"; plainLanguageSummary: string; proposedDefaults: string[]; spec: Record<string, unknown> };
type Market = { id: "usdc-cirbtc" | "usdc-eurc"; enabled: boolean };
type TypedChallenge = { challengeId: string; domain: unknown; types: unknown; primaryType: string; message: Record<string, unknown> };

const EMPTY_FEED: DeskFeed = { wallet: null, activeStrategy: null, snapshots: [], entries: [] };

function errorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") return fallback;
  const message = (value as ApiFailure).error?.message;
  return typeof message === "string" ? message : fallback;
}

function formatAtomicUsdc(value: string): string {
  const amount = BigInt(value);
  const whole = amount / 1_000_000n;
  const fraction = (amount % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toString()}${fraction ? `.${fraction}` : ""} USDC`;
}

function RecordDetails({ entry }: { entry: DeskEntry }) {
  const facts = checkedFacts(entry.reasons);
  return <details className="record-details">
    <summary>View record</summary>
    {facts.length ? <ul>{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <p>No structured checks were stored.</p>}
    {entry.market && <p>Reference: {entry.market.sourcePair}. Execution: Arc Testnet. Mapping: {entry.market.mappingKind} to {entry.market.outputAsset}.</p>}
    {entry.receipts?.map((receipt) => <a key={receipt.transactionHash} href={`https://testnet.arcscan.app/tx/${receipt.transactionHash}`} target="_blank" rel="noreferrer">View confirmed transaction</a>)}
  </details>;
}

function AgentRecord({ entry }: { entry: DeskEntry }) {
  const fact = checkedFacts(entry.reasons)[0];
  return <article className="simple-message agent-message">
    <p><strong>{decisionLabel(entry)}</strong>{fact ? ` ${fact}` : " A decision was recorded."}</p>
    <RecordDetails entry={entry} />
  </article>;
}

function AssetChart({ feed }: { feed: DeskFeed }) {
  const path = useMemo(() => usdcLinePath(feed.snapshots), [feed.snapshots]);
  const latest = feed.snapshots.at(-1);
  return <section className="simple-chart" aria-labelledby="assets-heading">
    <h2 id="assets-heading">Assets over time</h2>
    <div className="simple-chart-frame">
      <svg viewBox="0 0 640 180" role="img" aria-label={path ? "Reconciled trading USDC balance over time" : "No asset history is available yet"}>
        <path className="simple-chart-rule" d="M0 1H640M0 90H640M0 179H640" />
        {path && <path className="simple-chart-line" d={path} />}
      </svg>
      {!path && <p>No reconciled balance history yet.</p>}
    </div>
    <p className="chart-note">{latest ? `${formatAtomicUsdc(latest.usdcAtomic)} recorded most recently.` : "The graph begins after Arclet records real wallet balances."} This is balance history, not profit.</p>
  </section>;
}

export function DeskClient() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const { signTypedData } = useSignTypedData();
  const [feed, setFeed] = useState<DeskFeed>(EMPTY_FEED);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [instruction, setInstruction] = useState("");
  const [reply, setReply] = useState<CompileReply | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [notice, setNotice] = useState("Sign in to start.");
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error("A Privy access token is unavailable.");
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init?.method && init.method !== "GET") {
      headers.set("Content-Type", "application/json");
      headers.set("Origin", window.location.origin);
    }
    const response = await fetch(path, { ...init, headers });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorMessage(body, "Arclet could not complete that request."));
    return body;
  }, [getAccessToken]);

  const refresh = useCallback(async () => {
    if (!authenticated) return;
    try {
      setFeed(await request("/api/desk") as DeskFeed);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Arclet is unavailable.");
    }
  }, [authenticated, request]);

  useEffect(() => {
    void fetch("/api/markets").then((response) => response.json()).then((body: { markets?: Market[] }) => setMarkets(body.markets ?? [])).catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [authenticated, refresh]);

  async function run(action: () => Promise<void>) {
    setLoading(true);
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Arclet could not complete that request."); }
    finally { setLoading(false); }
  }

  const marketId = markets.find((market) => market.enabled)?.id ?? "usdc-cirbtc";
  const marketEnabled = markets.some((market) => market.id === marketId && market.enabled);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    await run(async () => {
      const result = await request("/api/strategies/compile", { method: "POST", body: JSON.stringify({ instruction, marketId }) }) as CompileReply;
      setReply(result);
      setDraftId(null);
      setNotice(result.kind === "draft" ? "Review the proposed rules before signing." : "Arclet needs more detail.");
    });
  }

  async function saveDraft() {
    if (!reply || reply.kind !== "draft" || !marketEnabled) return;
    await run(async () => {
      const draft = await request("/api/strategies", { method: "POST", body: JSON.stringify({ originalInstruction: instruction, spec: reply.spec }) }) as { id: string };
      setDraftId(draft.id);
      setNotice("Draft saved. Your signature is still required.");
    });
  }

  async function activateDraft() {
    if (!draftId) return;
    await run(async () => {
      const challenge = await request(`/api/strategies/${draftId}/approval-challenge`, { method: "POST", body: "{}" }) as TypedChallenge;
      const signed = await signTypedData({ domain: challenge.domain, types: challenge.types, primaryType: challenge.primaryType, message: challenge.message } as unknown as SignTypedDataParams);
      await request(`/api/strategies/${draftId}/activate`, { method: "POST", body: JSON.stringify({ challengeId: challenge.challengeId, signature: signed.signature }) });
      setReply(null);
      setDraftId(null);
      setInstruction("");
      setNotice("Mandate activated. Arclet will trade only when every approved check passes.");
      await refresh();
    });
  }

  async function pause() {
    if (!feed.activeStrategy || feed.activeStrategy.state !== "ACTIVE") return;
    await run(async () => {
      await request(`/api/strategies/${feed.activeStrategy?.id}/pause`, { method: "POST", body: "{}" });
      setNotice("Mandate paused. A transaction already submitted may still settle.");
      await refresh();
    });
  }

  return <div className="simple-desk">
    <h1>Arclet</h1>
    <p className="simple-intro">Tell Arclet how to trade. It turns your request into rules you approve, checks live market data, and reports every decision. This testnet uses a separate application-operated trading wallet.</p>

    <section className="simple-chat" aria-label="Chat with Arclet">
      <div className="simple-transcript" aria-live="polite">
        <article className="simple-message agent-message"><p>What should I watch, and when should I trade?</p></article>
        {feed.entries.slice(0, 4).reverse().map((entry) => <AgentRecord key={entry.id} entry={entry} />)}
        {instruction && reply && <article className="simple-message user-message"><p>{instruction}</p></article>}
        {reply && <article className="simple-message agent-message">
          {reply.kind === "draft" ? <>
            <p>{reply.plainLanguageSummary}</p>
            <details className="record-details"><summary>Review exact rules</summary><pre>{JSON.stringify(reply.spec, null, 2)}</pre></details>
            {draftId ? <button onClick={() => void activateDraft()} disabled={loading}>Sign and activate</button> : <button onClick={() => void saveDraft()} disabled={!marketEnabled || loading}>Save draft</button>}
            {!marketEnabled && <p>No market is enabled until its live data and execution route pass verification.</p>}
          </> : <ul>{[...reply.questions, ...reply.unsupportedReasons].map((item) => <li key={item}>{item}</li>)}</ul>}
        </article>}
      </div>

      <form className="simple-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="instruction">Tell Arclet how to trade</label>
        <textarea id="instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={4} disabled={!ready || !authenticated || loading} placeholder="Tell Arclet how you want it to trade for you." />
        {!authenticated && ready ? <button type="button" onClick={login}>Sign in</button> : <button type="submit" disabled={!ready || !authenticated || loading}>{loading ? "Working" : "Send"}</button>}
      </form>
      <div className="simple-status" role="status"><span>{notice}</span>{feed.activeStrategy?.state === "ACTIVE" && <button className="pause-link" type="button" onClick={() => void pause()} disabled={loading}>Pause</button>}</div>
    </section>

    <AssetChart feed={feed} />
  </div>;
}
