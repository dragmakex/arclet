export type DeskSnapshot = {
  observedAt: string;
  usdcAtomic: string;
};

export type DeskEntry = {
  id: string;
  result: "HOLD" | "EXECUTE";
  executionState: string | null;
  reasons: unknown;
  createdAt: string;
  observation: {
    provenance: unknown;
    metrics: unknown;
    qualityVerdict: string;
  } | null;
};

export type DeskFeed = {
  wallet: { address: string; operatingMode: string } | null;
  activeStrategy: { id: string; state: string } | null;
  snapshots: DeskSnapshot[];
  entries: DeskEntry[];
};

export function normalizeSnapshots(rows: Array<{ observed_at: Date | string; usdc_atomic: string | null }>): DeskSnapshot[] {
  return rows
    .filter((row): row is { observed_at: Date | string; usdc_atomic: string } => typeof row.usdc_atomic === "string" && /^(0|[1-9]\d*)$/.test(row.usdc_atomic))
    .map((row) => ({ observedAt: new Date(row.observed_at).toISOString(), usdcAtomic: row.usdc_atomic }));
}

/**
 * Produces screen coordinates only. Financial amounts remain exact strings in
 * the feed; conversion is limited to a normalized drawing scale.
 */
export function usdcLinePath(points: DeskSnapshot[], width = 640, height = 180): string | null {
  if (points.length < 2) return null;
  const values = points.map((point) => BigInt(point.usdcAtomic));
  const low = values.reduce((minimum, value) => value < minimum ? value : minimum);
  const high = values.reduce((maximum, value) => value > maximum ? value : maximum);
  const range = high - low;
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = range === 0n ? height / 2 : height - Number((value - low) * BigInt(height) / range);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export function decisionLabel(entry: Pick<DeskEntry, "result" | "executionState">): string {
  if (entry.result === "HOLD") return "HOLD";
  return entry.executionState?.toUpperCase() ?? "QUOTED";
}

export function checkedFacts(reasons: unknown): string[] {
  if (!Array.isArray(reasons)) return [];
  return reasons.flatMap((reason) => {
    if (!reason || typeof reason !== "object") return [];
    const record = reason as { code?: unknown; fact?: unknown; passed?: unknown };
    if (typeof record.code !== "string") return [];
    return [`${record.code}: ${typeof record.fact === "string" ? record.fact : record.passed === true ? "checked" : "not met"}`];
  });
}
