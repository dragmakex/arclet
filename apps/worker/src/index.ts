import postgres from "postgres";
import { capabilityStatus } from "../../../config/runtime";
import { evaluateJob } from "./evaluate-job";
import { reconcileJob } from "./reconcile-job";
import { createCircleAdapter } from "./runtime";
import { refreshMarkets } from "./refresh-market";
import { leaseDueJobs } from "./scheduler";
import { submitJob } from "./submit-job";
import { withdrawalJob } from "./withdrawal-job";

const status=capabilityStatus();
if(!process.env.DATABASE_URL){console.error("Arclet worker BLOCKED: DATABASE_URL is missing.");process.exit(1)}
if(process.env.APP_ENV==="arc-mainnet"||process.env.ALLOW_MAINNET==="true"){console.error("Arclet worker refuses mainnet until the separate readiness gate is implemented and approved.");process.exit(1)}
if(!status.capabilities.execution.ready){console.error("Arclet worker BLOCKED: Circle CLI path/session home are missing.");process.exit(1)}
const sql=postgres(process.env.DATABASE_URL,{max:6}),adapter=createCircleAdapter(),owner=`worker-${crypto.randomUUID()}`;
console.log(JSON.stringify({event:"worker_started",owner,environment:status.environment,tradingEnabled:status.tradingEnabled}));
let running=false;
const tick=async()=>{if(running)return;running=true;try{const jobs=await leaseDueJobs(sql,owner);for(const job of jobs){try{const typed={id:String(job.id),payload:job.payload,fencing_token:String(job.fencing_token),lease_owner:owner};if(job.type==="EVALUATE")await evaluateJob(sql,typed,adapter);else if(job.type==="SUBMIT")await submitJob(sql,typed,adapter);else if(job.type==="RECONCILE")await reconcileJob(sql,typed,adapter);else if(job.type==="WITHDRAWAL")await withdrawalJob(sql,typed,adapter);else await sql`UPDATE jobs SET terminal=true WHERE id=${job.id} AND fencing_token=${job.fencing_token}`;}catch(error){console.error(JSON.stringify({event:"job_error",jobId:job.id,type:job.type,message:error instanceof Error?error.message:"Unknown error"}));await sql`UPDATE jobs SET lease_owner=NULL,lease_expires_at=NULL,scheduled_at=now()+interval '15 seconds',terminal=(attempts>=3) WHERE id=${job.id} AND fencing_token=${job.fencing_token}`;}}}catch(error){console.error(JSON.stringify({event:"scheduler_error",message:error instanceof Error?error.message:"Unknown error"}))}finally{running=false}};
const timer=setInterval(tick,15_000),marketTimer=setInterval(()=>refreshMarkets(sql).catch((error)=>console.error(JSON.stringify({event:"market_refresh_error",message:error instanceof Error?error.message:"Unknown error"}))),30_000);await refreshMarkets(sql);await tick();process.on("SIGTERM",async()=>{clearInterval(timer);clearInterval(marketTimer);await sql.end();process.exit(0)});
