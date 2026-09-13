"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkedFacts, decisionLabel, usdcLinePath, type DeskFeed } from "../lib/desk";

type ApiFailure = { error?: { code?: string; message?: string } };
type CompileReply =
  | { kind: "needs_clarification"; questions: string[]; unsupportedReasons: string[] }
  | { kind: "draft"; plainLanguageSummary: string; proposedDefaults: string[]; spec: unknown };

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

function statusCopy(feed: DeskFeed): string {
  if (!feed.wallet) return "Needs a dedicated trading wallet";
  const entry = feed.entries[0];
  if (entry?.executionState === "UNKNOWN") return "Execution uncertain - reconciling";
  if (feed.activeStrategy?.state === "PAUSED") return "Mandate paused";
  if (feed.activeStrategy?.state === "ACTIVE") return "Mandate active";
  return "No active mandate";
}

function PortfolioChart({ feed }: { feed: DeskFeed }) {
  const path = useMemo(() => usdcLinePath(feed.snapshots), [feed.snapshots]);
  const latest = feed.snapshots.at(-1);
  return <section className="desk-section chart-section" aria-labelledby="portfolio-heading">
    <div className="section-heading"><div><p className="kicker">Ledger line</p><h2 id="portfolio-heading">Trading USDC</h2></div><p className="measure">Persisted ERC-20 USDC view</p></div>
    <div className="chart-frame">
      <div className="chart-y-label top">USDC</div><div className="chart-y-label bottom">0</div>
      {path ? <svg className="balance-chart" viewBox="0 0 640 180" role="img" aria-label="Line chart of persisted trading wallet ERC-20 USDC balances">
        <path className="chart-rule" d="M0 1H640M0 90H640M0 179H640" />
        <path className="chart-line" d={path} />
      </svg> : <div className="chart-empty"><strong>No balance history yet.</strong><span>Arclet will draw this line only after coherent wallet snapshots are persisted.</span></div>}
    </div>
    <div className="chart-caption"><span>{latest ? `Latest persisted balance: ${formatAtomicUsdc(latest.usdcAtomic)}` : "No recorded balance"}</span><span>Not profit or performance. It excludes unverified asset valuation.</span></div>
  </section>;
}

function DecisionTape({ feed }: { feed: DeskFeed }) {
  const latest = feed.entries[0];
  const facts = latest ? checkedFacts(latest.reasons) : [];
  const observation = latest?.observation;
  const metrics = observation && typeof observation.metrics === "object" && observation.metrics ? observation.metrics as Record<string, unknown> : null;
  const provenance = observation && typeof observation.provenance === "object" && observation.provenance ? observation.provenance as Record<string, unknown> : null;
  return <aside className="agent-desk" aria-labelledby="agent-desk-heading">
    <div className="section-heading"><div><p className="kicker">Agent desk</p><h2 id="agent-desk-heading">Decision tape</h2></div><output className="desk-status">{statusCopy(feed)}</output></div>
    <section className="tape-block"><h3>Latest rationale</h3>{latest ? <><p className="tape-state">{decisionLabel(latest)}</p><p>{facts[0] ?? "A recorded decision has no structured facts to display."}</p></> : <p>No policy decision has been recorded. No reasoning is invented before live evidence is stored.</p>}</section>
    <section className="tape-block"><h3>Checked facts</h3>{facts.length ? <ol className="facts">{facts.slice(0, 5).map((fact) => <li key={fact}>{fact}</li>)}</ol> : <p>Graph health, mandate limits, wallet balances, quote freshness, and execution state appear here after an evaluation.</p>}</section>
    <section className="tape-block"><h3>Source evidence</h3>{metrics && provenance ? <dl className="tape-data"><dt>Source chain</dt><dd>{String(metrics.sourceChainId ?? "Not recorded")}</dd><dt>Pool</dt><dd>{String(metrics.pool ?? "Not recorded")}</dd><dt>Block</dt><dd>{String(provenance.sourceBlockNumber ?? "Not recorded")}</dd><dt>Quality</dt><dd>{String(observation?.qualityVerdict ?? "Not recorded")}</dd></dl> : <p>Graph deployment, pool, block, freshness, and proxy mapping are shown only from stored validated observations.</p>}</section>
  </aside>;
}

export function DeskClient() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const [feed, setFeed] = useState<DeskFeed>(EMPTY_FEED);
  const [instruction, setInstruction] = useState("");
  const [marketId, setMarketId] = useState<"usdc-cirbtc" | "usdc-eurc">("usdc-cirbtc");
  const [compileReply, setCompileReply] = useState<CompileReply | null>(null);
  const [notice, setNotice] = useState("Sign in to read your desk. Trading remains disabled until live setup is verified.");
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
    if (!response.ok) throw new Error(errorMessage(body, "The desk request could not be completed."));
    return body;
  }, [getAccessToken]);

  const refresh = useCallback(async () => {
    if (!authenticated) return;
    try {
      const body = await request("/api/desk") as DeskFeed;
      setFeed(body);
      setNotice("Desk refreshed from authenticated persisted records.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The desk is unavailable.");
    }
  }, [authenticated, request]);

  useEffect(() => {
    if (!authenticated) return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [authenticated, refresh]);

  async function compile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    setLoading(true);
    setCompileReply(null);
    try {
      const body = await request("/api/strategies/compile", { method: "POST", body: JSON.stringify({ instruction, marketId }) }) as CompileReply;
      setCompileReply(body);
      setNotice(body.kind === "draft" ? "Draft interpretation received. Saving stays unavailable until the selected market is verified." : "Clarification is required before a draft can exist.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The compiler is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function pause() {
    if (!feed.activeStrategy || feed.activeStrategy.state !== "ACTIVE") return;
    setLoading(true);
    try {
      await request(`/api/strategies/${feed.activeStrategy.id}/pause`, { method: "POST", body: "{}" });
      setNotice("Pause was requested. A transaction already submitted may still settle.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pause could not be requested.");
    } finally { setLoading(false); }
  }

  const unconfigured = !ready || !authenticated;
  return <div className="desk">
    <div className="desk-masthead"><div><p className="edition">ARCLET FINANCIAL DESK / ARC TESTNET</p><h1>THE MANDATE</h1></div><div className="masthead-note">Rules you approve. Facts we record.<br />No real monetary value.</div></div>
    <div className="desk-grid">
      <section className="chat-desk" aria-labelledby="chat-heading">
        <div className="section-heading"><div><p className="kicker">Correspondence</p><h2 id="chat-heading">Ask the desk</h2></div><button className="text-button" type="button" onClick={() => void refresh()} disabled={unconfigured || loading}>Refresh records</button></div>
        <div className="transcript" aria-live="polite">
          <article className="message message-agent"><p className="message-byline">ARCLET / DESK NOTE</p><p>Describe a supported bounded strategy, or ask what a recorded decision means. The desk proposes rules. It does not sign, fund, or trade for you.</p></article>
          {compileReply && <article className="message message-agent"><p className="message-byline">ARCLET / RESPONSE</p>{compileReply.kind === "draft" ? <><p>{compileReply.plainLanguageSummary}</p><p className="draft-note">Proposed defaults: {compileReply.proposedDefaults.join("; ") || "none"}.</p><button disabled title="Markets are unavailable until the Graph and Circle probes pass">Save draft after market verification</button></> : <><p>More detail is required before a mandate can be proposed.</p><ul>{compileReply.questions.map((question) => <li key={question}>{question}</li>)}{compileReply.unsupportedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}</article>}
          <p className="desk-notice" role="status">{notice}</p>
        </div>
        <form className="composer" onSubmit={compile}>
          <label htmlFor="desk-instruction">Instruction</label>
          <textarea id="desk-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={unconfigured || loading} rows={4} placeholder="Example: Buy 1 USDC of cirBTC daily, subject to the visible limits." />
          <div className="composer-actions"><label className="market-select" htmlFor="desk-market">Market<select id="desk-market" value={marketId} onChange={(event) => setMarketId(event.target.value as typeof marketId)} disabled={unconfigured || loading}><option value="usdc-cirbtc">USDC / cirBTC</option><option value="usdc-eurc">USDC / EURC</option></select></label>{!authenticated && ready ? <button type="button" onClick={login}>Sign in to use the desk</button> : <button type="submit" disabled={unconfigured || loading}>{loading ? "Working" : "Ask Arclet"}</button>}</div>
        </form>
        <div className="desk-controls"><button className="pause-control" type="button" onClick={() => void pause()} disabled={feed.activeStrategy?.state !== "ACTIVE" || loading}>Pause mandate</button><span>Pause does not reverse a transaction already submitted.</span><button className="text-button" type="button" disabled title="Withdrawal requires a separate signed amount and verified linked wallet">Prepare withdrawal</button></div>
      </section>
      <DecisionTape feed={feed} />
      <section className="ledger-section" aria-labelledby="ledger-heading"><div className="section-heading"><div><p className="kicker">Recorded actions</p><h2 id="ledger-heading">Trade ledger</h2></div><span className="ledger-count">{feed.entries.length} entries</span></div>{feed.entries.length ? <ol className="trade-ledger">{feed.entries.map((entry) => <li key={entry.id}><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time><strong>{decisionLabel(entry)}</strong><span>{checkedFacts(entry.reasons)[0] ?? "Recorded decision"}</span></li>)}</ol> : <div className="ledger-empty">No HOLD, quote, submission, receipt, failed, or unknown state has been recorded for this wallet.</div>}</section>
      <PortfolioChart feed={feed} />
    </div>
  </div>;
}
