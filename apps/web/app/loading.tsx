import { LoadingIndicator } from "../components/loading-indicator";

export default function Loading(){return <section className="stack" aria-label="Loading" aria-busy="true"><p role="status"><LoadingIndicator label="Loading Arclet…" /></p><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></section>}
