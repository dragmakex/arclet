import postgres from "postgres";
import { leaseDueJobs } from "./scheduler";
import { capabilityStatus } from "../../../config/runtime";
const status = capabilityStatus();
if (!process.env.DATABASE_URL) { console.error("Arclet worker BLOCKED: DATABASE_URL is missing."); process.exit(1); }
if (process.env.APP_ENV === "arc-mainnet") { console.error("Arclet worker refuses mainnet until the separate readiness gate is implemented and approved."); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const owner = `worker-${crypto.randomUUID()}`;
console.log(JSON.stringify({ event: "worker_started", owner, environment: status.environment, tradingEnabled: false }));
const timer = setInterval(async () => { try { const jobs = await leaseDueJobs(sql, owner); for (const job of jobs) console.log(JSON.stringify({ event: "job_leased_no_submission", jobId: job.id, type: job.type, reason: "External submission remains gated pending verified provider fixtures and live approval" })); } catch (error) { console.error(JSON.stringify({ event: "scheduler_error", message: error instanceof Error ? error.message : "Unknown error" })); } }, 15_000);
process.on("SIGTERM", async () => { clearInterval(timer); await sql.end(); process.exit(0); });
