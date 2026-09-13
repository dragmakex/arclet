"use client";

import { type SignTypedDataParams, usePrivy, useSendTransaction, useSignTypedData } from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkedFacts, decisionLabel, usdcInputToAtomic, usdcLinePath, type DeskEntry, type DeskFeed } from "../lib/desk";

type ApiFailure = { error?: { code?: string; message?: string } };
type CompileReply =
  | { kind: "needs_clarification"; questions: string[]; unsupportedReasons: string[] }
  | { kind: "draft"; plainLanguageSummary: string; proposedDefaults: string[]; spec: Record<string, unknown> };
type Market = { id: "usdc-cirbtc" | "usdc-eurc"; enabled: boolean; reason: string };
type Portfolio = {
  personalWallet?: string;
  tradingWallet: null | { address: string };
  personal?: { address: string; erc20UsdcAtomic6: string };
  trading?: { address: string; erc20UsdcAtomic6: string; reservedUsdcAtomic6: string };
  accountingNote?: string;
};
type TypedChallenge = { challengeId: string; domain: unknown; types: unknown; primaryType: string; message: Record<string, unknown> };
type FundingIntent = { id: string; expiresAt: number; destination: string; transaction: { chainId: number; to: string; data: string; value: string } };

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

function shortAddress(value: string | undefined): string {
  return value && value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value ?? "Not assigned";
}

function statusCopy(feed: DeskFeed): string {
  if (!feed.wallet) return "Needs a dedicated trading wallet";
  const entry = feed.entries[0];
  if (entry?.executionState === "UNKNOWN") return "Execution uncertain - reconciling";
  if (feed.activeStrategy?.state === "PAUSED") return "Mandate paused";
  if (feed.activeStrategy?.state === "ACTIVE") return "Mandate active";
  return "No active mandate";
}

function Evidence({ entry }: { entry: DeskEntry }) {
  const facts = checkedFacts(entry.reasons);
  const metrics = entry.observation?.metrics && typeof entry.observation.metrics === "object" ? entry.observation.metrics as Record<string, unknown> : {};
  const provenance = entry.observation?.provenance && typeof entry.observation.provenance === "object" ? entry.observation.provenance as Record<string, unknown> : {};
  return <details className="evidence"><summary>View decision evidence</summary><div className="evidence-body">
    <h4>Checked facts</h4>{facts.length ? <ol className="facts">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ol> : <p>No structured policy facts were persisted for this decision.</p>}
    <h4>Networks and mapping</h4><dl className="tape-data"><dt>Source network</dt><dd>{String(metrics.sourceChainId ?? "Not recorded")}</dd><dt>Execution network</dt><dd>Arc Testnet / 5042002</dd><dt>Reference pair</dt><dd>{entry.market?.sourcePair ?? "Not recorded"}</dd><dt>Mapping</dt><dd>{entry.market ? `${entry.market.mappingKind} to ${entry.market.outputAsset}` : "Not recorded"}</dd></dl>
    <h4>Graph evidence</h4><dl className="tape-data"><dt>Subgraph</dt><dd>{String(provenance.subgraphId ?? "Not recorded")}</dd><dt>Deployment</dt><dd>{String(metrics.deployment ?? provenance.deploymentId ?? "Not recorded")}</dd><dt>Pool</dt><dd>{String(metrics.pool ?? "Not recorded")}</dd><dt>Source block</dt><dd>{String(provenance.sourceBlockNumber ?? "Not recorded")}</dd><dt>Observed</dt><dd>{provenance.fetchedAt ? new Date(Number(provenance.fetchedAt) * 1000).toLocaleString() : "Not recorded"}</dd><dt>Freshness</dt><dd>{metrics.sourceBlockAgeSeconds === undefined ? "Not recorded" : `${String(metrics.sourceBlockAgeSeconds)} seconds at evaluation`}</dd></dl>
    {entry.receipts?.length ? <><h4>Confirmed on Arc</h4><ul className="receipt-links">{entry.receipts.map((receipt) => <li key={receipt.transactionHash}><a href={`https://testnet.arcscan.app/tx/${receipt.transactionHash}`} target="_blank" rel="noreferrer">{shortAddress(receipt.transactionHash)} on Arcscan</a></li>)}</ul></> : <p className="muted">No Arcscan link is shown until a successful receipt is reconciled.</p>}
  </div></details>;
}

function PortfolioChart({ feed }: { feed: DeskFeed }) {
  const path = useMemo(() => usdcLinePath(feed.snapshots), [feed.snapshots]);
  const latest = feed.snapshots.at(-1);
  return <section className="desk-section chart-section" aria-labelledby="portfolio-heading"><div className="section-heading"><div><p className="kicker">Ledger line</p><h2 id="portfolio-heading">Trading USDC</h2></div><p className="measure">Persisted ERC-20 USDC view</p></div><div className="chart-frame"><div className="chart-y-label top">USDC</div><div className="chart-y-label bottom">0</div>{path ? <svg className="balance-chart" viewBox="0 0 640 180" role="img" aria-label="Line chart of persisted trading wallet ERC-20 USDC balances"><path className="chart-rule" d="M0 1H640M0 90H640M0 179H640" /><path className="chart-line" d={path} /></svg> : <div className="chart-empty"><strong>No balance history yet.</strong><span>Arclet will draw this line only after coherent wallet snapshots are persisted.</span></div>}</div><div className="chart-caption"><span>{latest ? `Latest persisted balance: ${formatAtomicUsdc(latest.usdcAtomic)}` : "No recorded balance"}</span><span>Not profit or performance. It excludes unverified asset valuation.</span></div></section>;
}

function DecisionTape({ feed }: { feed: DeskFeed }) {
  const latest = feed.entries[0];
  const facts = latest ? checkedFacts(latest.reasons) : [];
  return <aside className="agent-desk" aria-labelledby="agent-desk-heading"><div className="section-heading"><div><p className="kicker">Agent desk</p><h2 id="agent-desk-heading">Decision tape</h2></div><output className="desk-status">{statusCopy(feed)}</output></div><section className="tape-block"><h3>Latest rationale</h3>{latest ? <><p className="tape-state">{decisionLabel(latest)}</p><p>{facts[0] ?? "A recorded decision has no structured facts to display."}</p></> : <p>No policy decision has been recorded. No reasoning is invented before live evidence is stored.</p>}</section><section className="tape-block"><h3>Checked facts</h3>{facts.length ? <ol className="facts">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ol> : <p>Graph health, mandate limits, wallet balances, quote freshness, and execution state appear here after an evaluation.</p>}</section><section className="tape-block"><h3>Source and execution</h3>{latest ? <Evidence entry={latest} /> : <p>Graph deployment, pool, block, freshness, execution network, and proxy mapping are shown only from stored validated observations.</p>}</section></aside>;
}

export function DeskClient() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const { signTypedData } = useSignTypedData();
  const { sendTransaction } = useSendTransaction();
  const [feed, setFeed] = useState<DeskFeed>(EMPTY_FEED);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [instruction, setInstruction] = useState("");
  const [marketId, setMarketId] = useState<Market["id"]>("usdc-cirbtc");
  const [compileReply, setCompileReply] = useState<CompileReply | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("1");
  const [fundingIntent, setFundingIntent] = useState<FundingIntent | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("1");
  const [withdrawalChallenge, setWithdrawalChallenge] = useState<TypedChallenge | null>(null);
  const [notice, setNotice] = useState("Sign in to read your desk. Trading remains disabled until live setup is verified.");
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error("A Privy access token is unavailable.");
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init?.method && init.method !== "GET") { headers.set("Content-Type", "application/json"); headers.set("Origin", window.location.origin); }
    const response = await fetch(path, { ...init, headers });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorMessage(body, "The desk request could not be completed."));
    return body;
  }, [getAccessToken]);

  const refresh = useCallback(async () => {
    if (!authenticated) return;
    try {
      const [desk, balances] = await Promise.all([request("/api/desk") as Promise<DeskFeed>, request("/api/portfolio") as Promise<Portfolio>]);
      setFeed(desk); setPortfolio(balances); setNotice("Desk refreshed from authenticated persisted records.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "The desk is unavailable."); }
  }, [authenticated, request]);

  useEffect(() => { void fetch("/api/markets").then((response) => response.json()).then((body: { markets?: Market[] }) => setMarkets(body.markets ?? [])).catch(() => setMarkets([])); }, []);
  useEffect(() => { if (!authenticated) return; const initial = window.setTimeout(() => void refresh(), 0); const interval = window.setInterval(() => void refresh(), 30_000); return () => { window.clearTimeout(initial); window.clearInterval(interval); }; }, [authenticated, refresh]);

  async function run(action: () => Promise<void>) { setLoading(true); try { await action(); } catch (error) { setNotice(error instanceof Error ? error.message : "The requested action was not completed."); } finally { setLoading(false); } }
  function enabledMarket() { return markets.find((market) => market.id === marketId)?.enabled === true; }
  async function signChallenge(challenge: TypedChallenge): Promise<string> { const result = await signTypedData({ domain: challenge.domain, types: challenge.types, primaryType: challenge.primaryType, message: challenge.message } as unknown as SignTypedDataParams); return result.signature; }

  async function compile(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!instruction.trim()) return; await run(async () => { const body = await request("/api/strategies/compile", { method: "POST", body: JSON.stringify({ instruction, marketId }) }) as CompileReply; setCompileReply(body); setDraftId(null); setNotice(body.kind === "draft" ? "Review the complete proposed mandate below. It cannot activate without your signature." : "Clarification is required before a draft can exist."); }); }
  async function saveDraft() { if (!compileReply || compileReply.kind !== "draft" || !enabledMarket()) return; await run(async () => { const draft = await request("/api/strategies", { method: "POST", body: JSON.stringify({ originalInstruction: instruction, spec: compileReply.spec }) }) as { id: string }; setDraftId(draft.id); setNotice("Immutable draft saved. Review exact rules, then request your Privy signature."); }); }
  async function activateDraft() { if (!draftId) return; await run(async () => { const challenge = await request(`/api/strategies/${draftId}/approval-challenge`, { method: "POST", body: "{}" }) as TypedChallenge; const signature = await signChallenge(challenge); await request(`/api/strategies/${draftId}/activate`, { method: "POST", body: JSON.stringify({ challengeId: challenge.challengeId, signature }) }); setNotice("Mandate activated. The worker still requires a verified market and live guards before it can submit anything."); await refresh(); }); }
  async function pause() { if (!feed.activeStrategy || feed.activeStrategy.state !== "ACTIVE") return; await run(async () => { await request(`/api/strategies/${feed.activeStrategy?.id}/pause`, { method: "POST", body: "{}" }); setNotice("Pause was requested. A transaction already submitted may still settle."); await refresh(); }); }
  async function claimWallet() { await run(async () => { await request("/api/trading-wallet/claim", { method: "POST", body: "{}" }); setNotice("A dedicated application-operated trading wallet was assigned."); await refresh(); }); }
  async function prepareFunding() { const amountAtomic = usdcInputToAtomic(fundAmount); if (!amountAtomic) { setNotice("Enter a positive USDC amount with no more than six decimal places."); return; } await run(async () => { const intent = await request("/api/funding-intents", { method: "POST", body: JSON.stringify({ amountAtomic, chainId: 5042002 }) }) as FundingIntent; setFundingIntent(intent); setNotice("Funding intent prepared. Confirm its source, destination, amount, network, and fee notice before signing in Privy."); }); }
  async function signFunding() { if (!fundingIntent) return; await run(async () => { const sent = await sendTransaction({ chainId: fundingIntent.transaction.chainId, to: fundingIntent.transaction.to, data: fundingIntent.transaction.data, value: fundingIntent.transaction.value }); await request(`/api/funding-intents/${fundingIntent.id}/confirm`, { method: "POST", body: JSON.stringify({ transactionHash: sent.hash }) }); setFundingIntent(null); setNotice("Funding receipt submitted for independent Arc verification."); await refresh(); }); }
  async function prepareWithdrawal() { const amountAtomic = usdcInputToAtomic(withdrawAmount); if (!amountAtomic) { setNotice("Enter a positive USDC amount with no more than six decimal places."); return; } await run(async () => { const challenge = await request("/api/withdrawals/challenge", { method: "POST", body: JSON.stringify({ asset: "USDC", amountAtomic }) }) as TypedChallenge; setWithdrawalChallenge(challenge); setNotice("Withdrawal proposal prepared for your verified linked Privy wallet. Review destination and amount before signing."); }); }
  async function signWithdrawal() { if (!withdrawalChallenge) return; await run(async () => { const signature = await signChallenge(withdrawalChallenge); const result = await request("/api/withdrawals", { method: "POST", body: JSON.stringify({ challengeId: withdrawalChallenge.challengeId, signature }) }) as { id: string }; setWithdrawalChallenge(null); setNotice(`Withdrawal ${result.id} is authorized and awaiting guarded worker processing.`); await refresh(); }); }

  const unconfigured = !ready || !authenticated;
  const market = markets.find((candidate) => candidate.id === marketId);
  const fundingDescription = "Funding is an ERC-20 USDC transfer on Arc Testnet. Fee estimate is unavailable until the wallet confirmation. Keep your personal wallet gas buffer.";
  return <div className="desk"><div className="desk-masthead"><div><p className="edition">ARCLET FINANCIAL DESK / ARC TESTNET</p><h1>THE MANDATE</h1></div><div className="masthead-note">Rules you approve. Facts we record.<br />No real monetary value.</div></div><div className="desk-grid">
    <section className="chat-desk" aria-labelledby="chat-heading"><div className="section-heading"><div><p className="kicker">Correspondence</p><h2 id="chat-heading">Ask the desk</h2></div><button className="text-button" type="button" onClick={() => void refresh()} disabled={unconfigured || loading}>Refresh records</button></div><div className="transcript" aria-live="polite"><article className="message message-agent"><p className="message-byline">ARCLET / DESK NOTE</p><p>Describe a supported bounded strategy, or ask what a recorded decision means. The desk proposes rules. It does not sign, fund, or trade for you.</p></article>{compileReply && <article className="message message-agent"><p className="message-byline">ARCLET / REVIEW COPY</p>{compileReply.kind === "draft" ? <><p>{compileReply.plainLanguageSummary}</p><p className="draft-note">Proposed defaults: {compileReply.proposedDefaults.join("; ") || "none"}.</p><details className="rule-preview"><summary>Inspect exact rules before signing</summary><pre>{JSON.stringify(compileReply.spec, null, 2)}</pre></details>{draftId ? <button onClick={() => void activateDraft()} disabled={loading}>Sign and activate this mandate</button> : <><button onClick={() => void saveDraft()} disabled={!enabledMarket() || loading} aria-describedby="market-save-note">Save reviewed draft</button><p id="market-save-note" className="disabled-explanation">{enabledMarket() ? "A saved draft still requires a distinct Privy EIP-712 signature." : `${market?.reason ?? "This market is not verified."} Saving remains unavailable.`}</p></>}</> : <><p>More detail is required before a mandate can be proposed.</p><ul>{compileReply.questions.map((question) => <li key={question}>{question}</li>)}{compileReply.unsupportedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}</article>}<p className="desk-notice" role="status">{notice}</p></div><form className="composer" onSubmit={compile}><label htmlFor="desk-instruction">Instruction</label><textarea id="desk-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={unconfigured || loading} rows={4} placeholder="Example: Buy 1 USDC of cirBTC daily, subject to the visible limits." /><div className="composer-actions"><label className="market-select" htmlFor="desk-market">Market<select id="desk-market" value={marketId} onChange={(event) => setMarketId(event.target.value as Market["id"])} disabled={unconfigured || loading}><option value="usdc-cirbtc">USDC / cirBTC</option><option value="usdc-eurc">USDC / EURC</option></select></label>{!authenticated && ready ? <button type="button" onClick={login}>Sign in to use the desk</button> : <button type="submit" disabled={unconfigured || loading}>{loading ? "Working" : "Ask Arclet"}</button>}</div></form><div className="desk-controls"><button className="pause-control" type="button" onClick={() => void pause()} disabled={feed.activeStrategy?.state !== "ACTIVE" || loading} aria-describedby="pause-note">Pause mandate</button><span id="pause-note">Pause does not reverse a transaction already submitted.</span></div></section>
    <DecisionTape feed={feed} />
    <section className="money-desk" aria-labelledby="money-heading"><div className="section-heading"><div><p className="kicker">Money movement</p><h2 id="money-heading">Funding and withdrawal</h2></div><span className="ledger-count">Explicit signatures only</span></div>{portfolio?.tradingWallet ? <div className="wallet-figures"><p><strong>Personal wallet</strong><span>{shortAddress(portfolio.personal?.address ?? portfolio.personalWallet)} {portfolio.personal ? ` / ${formatAtomicUsdc(portfolio.personal.erc20UsdcAtomic6)}` : ""}</span></p><p><strong>Trading wallet</strong><span>{shortAddress(portfolio.trading?.address)} {portfolio.trading ? ` / ${formatAtomicUsdc(portfolio.trading.erc20UsdcAtomic6)}` : ""}</span></p></div> : <div className="money-empty"><p>A distinct Circle trading wallet is required before funding. It is application-operated after funds arrive.</p><button type="button" onClick={() => void claimWallet()} disabled={unconfigured || loading}>Claim dedicated trading wallet</button></div>}{portfolio?.tradingWallet && <div className="money-forms"><form onSubmit={(event) => { event.preventDefault(); void prepareFunding(); }}><h3>Fund trading wallet</h3><label htmlFor="fund-amount">Amount in USDC<input id="fund-amount" inputMode="decimal" value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} disabled={loading} /></label><dl className="money-review"><dt>Source</dt><dd>{shortAddress(portfolio.personal?.address)}</dd><dt>Destination</dt><dd>{shortAddress(portfolio.trading?.address)}</dd><dt>Network</dt><dd>Arc Testnet / 5042002</dd><dt>Fee</dt><dd>Estimated at wallet confirmation</dd></dl><p>{fundingDescription}</p>{fundingIntent ? <button type="button" onClick={() => void signFunding()} disabled={loading}>Confirm and sign USDC transfer</button> : <button type="submit" disabled={loading}>Prepare funding intent</button>}</form><form onSubmit={(event) => { event.preventDefault(); void prepareWithdrawal(); }}><h3>Withdraw USDC</h3><label htmlFor="withdraw-amount">Amount in USDC<input id="withdraw-amount" inputMode="decimal" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} disabled={loading} /></label><dl className="money-review"><dt>Destination</dt><dd>{shortAddress(portfolio.personal?.address)}</dd><dt>Network</dt><dd>Arc Testnet / 5042002</dd><dt>Asset</dt><dd>USDC only</dd><dt>Fee</dt><dd>Recorded after settlement</dd></dl><p>Withdrawal is fixed to your server-verified linked Privy wallet. Arclet never accepts an arbitrary recipient.</p>{withdrawalChallenge ? <button type="button" onClick={() => void signWithdrawal()} disabled={loading}>Sign withdrawal authorization</button> : <button type="submit" disabled={loading}>Prepare withdrawal proposal</button>}</form></div>}<p className="accounting-note">{portfolio?.accountingNote ?? "Balances appear after authenticated chain reconciliation."}</p></section>
    <section className="ledger-section" aria-labelledby="ledger-heading"><div className="section-heading"><div><p className="kicker">Recorded actions</p><h2 id="ledger-heading">Trade ledger</h2></div><span className="ledger-count">{feed.entries.length} entries</span></div>{feed.entries.length ? <ol className="trade-ledger">{feed.entries.map((entry) => <li key={entry.id}><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time><strong>{decisionLabel(entry)}</strong><span>{checkedFacts(entry.reasons)[0] ?? "Recorded decision"}<Evidence entry={entry} /></span></li>)}</ol> : <div className="ledger-empty">No HOLD, quote, submission, receipt, failed, or unknown state has been recorded for this wallet.</div>}</section><PortfolioChart feed={feed} />
  </div></div>;
}
