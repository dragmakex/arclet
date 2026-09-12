import { z } from "zod";

const boolString = z.enum(["true", "false"]).transform((value) => value === "true");
const atomic = z.string().regex(/^(0|[1-9]\d*)$/);
const testnetRpc = z.string().url().refine((value) => !/mainnet/i.test(value), "Arc Testnet RPC must not be a mainnet endpoint");

export const runtimeEnvSchema = z.object({
  APP_ENV: z.enum(["test", "arc-testnet"]).default("arc-testnet"),
  APP_CANONICAL_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().startsWith("postgresql://").optional(),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1).optional(),
  PRIVY_APP_ID: z.string().min(1).optional(),
  PRIVY_APP_SECRET: z.string().min(1).optional(),
  ARC_RPC_URL: testnetRpc.default("https://rpc.testnet.arc.io"),
  SOURCE_RPC_URL: z.string().url().optional(),
  GRAPH_API_KEY: z.string().min(1).optional(),
  GRAPH_SUBGRAPH_ID: z.string().min(20).default("5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV"),
  GRAPH_DEPLOYMENT_ID: z.string().min(1).optional(),
  GRAPH_POOL_ID: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  AI_PROVIDER: z.literal("openai-compatible").default("openai-compatible"),
  AI_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
  CIRCLE_CLI_PATH: z.string().startsWith("/").optional(),
  CIRCLE_HOME: z.string().startsWith("/").optional(),
  CIRCLE_CHAIN: z.literal("ARC-TESTNET").default("ARC-TESTNET"),
  DEMO_USER_ALLOWLIST: z.string().min(1).optional(),
  MAX_FUNDED_USERS: z.coerce.number().int().min(1).max(5).default(5),
  MAX_TRADE_USDC_ATOMIC: atomic.default("2000000"),
  MAX_DAILY_TURNOVER_USDC_ATOMIC: atomic.default("5000000"),
  MIN_USDC_RESERVE_ATOMIC: atomic.default("2000000"),
  MAX_SLIPPAGE_BPS: z.coerce.number().int().min(1).max(100).default(100),
  TRADING_ENABLED: boolString.default(false),
  ALLOW_MAINNET: z.literal("false").transform(() => false).default(false),
  EVIDENCE_DIR: z.string().default("./docs/evidence")
}).strict();

export type RuntimeConfig = z.infer<typeof runtimeEnvSchema>;
const keys = Object.keys(runtimeEnvSchema.shape);
export function parseRuntimeConfig(source: NodeJS.ProcessEnv = process.env) {
  const known = Object.fromEntries(keys.flatMap((key) => source[key] === undefined ? [] : [[key, source[key]]]));
  return runtimeEnvSchema.safeParse(known);
}

type Capability = { ready: boolean; missing: string[] };
function capability(source: NodeJS.ProcessEnv, required: string[]): Capability {
  const missing = required.filter((key) => !source[key]);
  return { ready: missing.length === 0, missing };
}
export function capabilityStatus(source: NodeJS.ProcessEnv = process.env) {
  const parsed = parseRuntimeConfig(source);
  const capabilities = {
    database: capability(source, ["DATABASE_URL"]),
    identity: capability(source, ["NEXT_PUBLIC_PRIVY_APP_ID", "PRIVY_APP_ID", "PRIVY_APP_SECRET", "DEMO_USER_ALLOWLIST"]),
    marketData: capability(source, ["GRAPH_API_KEY", "SOURCE_RPC_URL", "GRAPH_DEPLOYMENT_ID", "GRAPH_POOL_ID"]),
    execution: capability(source, ["CIRCLE_CLI_PATH", "CIRCLE_HOME"]),
    compiler: capability(source, ["AI_BASE_URL", "AI_API_KEY", "AI_MODEL"])
  };
  const financialMissing = [...capabilities.database.missing, ...capabilities.identity.missing, ...capabilities.marketData.missing, ...capabilities.execution.missing];
  return {
    configured: parsed.success && financialMissing.length === 0,
    environment: source.APP_ENV ?? "arc-testnet",
    tradingEnabled: source.TRADING_ENABLED === "true",
    missing: [...new Set([...financialMissing, ...capabilities.compiler.missing])],
    errors: parsed.success ? [] : parsed.error.issues.map((issue) => issue.message),
    capabilities
  };
}

export function runtimeSafetyLimits(source: NodeJS.ProcessEnv = process.env) {
  const result = parseRuntimeConfig(source);
  if (!result.success) throw new Error(result.error.issues.map((issue) => issue.message).join("; "));
  return {
    maxTradeUsdcAtomic: result.data.MAX_TRADE_USDC_ATOMIC,
    maxDailyTurnoverUsdcAtomic: result.data.MAX_DAILY_TURNOVER_USDC_ATOMIC,
    minUsdcReserveAtomic: result.data.MIN_USDC_RESERVE_ATOMIC,
    maxSlippageBps: result.data.MAX_SLIPPAGE_BPS,
    maxExecutions: 3,
    maxDurationSeconds: 7 * 86_400
  };
}
