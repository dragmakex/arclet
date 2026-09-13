import { ActivityClient } from "../../components/activity-client";

export const dynamic = "force-dynamic";

export default function ActivityPage() {
  if (process.env.NEXT_PUBLIC_PRIVY_APP_ID) return <ActivityClient />;
  return <div className="stack"><div><p className="kicker">Archive</p><h1>Activity and evidence</h1><p className="muted">Configure Privy before Arclet can retrieve tenant-scoped records.</p></div><section className="panel"><h2>Recent decisions</h2><div className="empty">No decisions or transactions have been recorded. Arclet does not substitute example activity.</div></section></div>;
}
