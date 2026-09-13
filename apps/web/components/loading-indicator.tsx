export function LoadingIndicator({ label = "Working…" }: { label?: string }) {
  return <span className="loading-indicator"><span className="loading-spinner" aria-hidden="true" />{label}</span>;
}
