export function DeskUnconfigured() {
  return <div className="simple-desk">
    <h1>Arclet</h1>
    <p className="simple-intro">Tell Arclet how to trade. It turns your request into rules you approve, checks live market data, and reports every decision. This testnet uses a separate application-operated trading wallet.</p>

    <section className="simple-chat" aria-label="Chat with Arclet">
      <div className="simple-transcript" aria-live="polite">
        <article className="simple-message agent-message">
          <p>Connect Privy in setup before asking Arclet to create or explain a trading mandate.</p>
        </article>
      </div>
      <div className="simple-composer">
        <label className="sr-only" htmlFor="setup-instruction">Tell Arclet how to trade</label>
        <textarea id="setup-instruction" rows={4} disabled placeholder="Tell Arclet how you want it to trade for you." />
        <button disabled>Send</button>
      </div>
    </section>

    <section className="simple-chart" aria-labelledby="assets-heading">
      <h2 id="assets-heading">Assets over time</h2>
      <div className="simple-chart-frame">
        <svg viewBox="0 0 640 180" role="img" aria-label="No asset history is available yet">
          <path className="simple-chart-rule" d="M0 1H640M0 90H640M0 179H640" />
        </svg>
        <p>No reconciled balance history yet.</p>
      </div>
    </section>
  </div>;
}
