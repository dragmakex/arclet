import { z } from "zod";

const boolString = z.enum(["true", "false"]).transform((value) => value === "true");
const atomic = z.string().regex(/^(0|[1-9]\d*)$/);

export const runtimeEnvSchema = z.object({
  APP_ENV: z.enum(["test", "arc-testnet", "arc-mainnet"]).default("arc-testnet"),
  APP_CANONICAL_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().startsWith("postgresql://").optional(),
  PRIVY_APP_ID: z.string().min(1).optional(),
  PRIVY_APP_SECRET: z.string().min(1).optional(),
  ARC_RPC_URL: z.string().url().default("https://rpc.testnet.arc.io"),
  SOURCE_RPC_URL: z.string().url().optional(),
  GRAPH_API_KEY: z.string().min(1).optional(),
  GRAPH_SUBGRAPH_ID: z.string().min(20).default("5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV"),
  AI_PROVIDER: z.literal("openai-compatible").default("openai-compatible"),
  AI_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
  CIRCLE_CLI_PATH: z.string().startsWith("/").optional(),
  CIRCLE_HOME: z.string().startsWith("/").optional(),
  CIRCLE_CHAIN: z.literal("ARC-TESTNET").default("ARC-TESTNET"),
  MAX_FUNDED_USERS: z.coerce.number().int().min(1).max(5).default(5),
  MAX_TRADE_USDC_ATOMIC: atomic.default("2000000"),
  MAX_DAILY_TURNOVER_USDC_ATOMIC: atomic.default("5000000"),
  MIN_USDC_RESERVE_ATOMIC: atomic.default("2000000"),
  MAX_SLIPPAGE_BPS: z.coerce.number().int().min(1).max(100).default(100),
  TRADING_ENABLED: boolString.default(false),
  ALLOW_MAINNET: boolString.default(false),
  MAINNET_APPROVED_COMMIT: z.string().min(7).optional(),
  EVIDENCE_DIR: z.string().default("./docs/evidence")
}).strict().superRefine((env, ctx) => {
  if (env.APP_ENV === "arc-mainnet" && (!env.ALLOW_MAINNET || !env.MAINNET_APPROVED_COMMIT)) {
    ctx.addIssue({ code: "custom", message: "Mainnet requires ALLOW_MAINNET=true and a reviewed commit" });
  }
  if (env.APP_ENV !== "arc-mainnet" && env.ALLOW_MAINNET) {
    ctx.addIssue({ code: "custom", message: "ALLOW_MAINNET conflicts with the selected environment" });
  }
});

export type RuntimeConfig = z.infer<typeof runtimeEnvSchema>;
export function parseRuntimeConfig(source: NodeJS.ProcessEnv = process.env) {
  const known = Object.fromEntries(Object.keys(runtimeEnvSchema.shape).flatMap((key) => source[key] === undefined ? [] : [[key, source[key]]]));
  return runtimeEnvSchema.safeParse(known);
}

export function capabilityStatus(source: NodeJS.ProcessEnv = process.env) {
  const parsed = parseRuntimeConfig(source);
  const missing = ["DATABASE_URL", "PRIVY_APP_ID", "PRIVY_APP_SECRET", "GRAPH_API_KEY", "SOURCE_RPC_URL", "AI_BASE_URL", "AI_API_KEY", "AI_MODEL", "CIRCLE_CLI_PATH", "CIRCLE_HOME"].filter((key) => !source[key]);
  return { configured: parsed.success && missing.length === 0, environment: source.APP_ENV ?? "arc-testnet", tradingEnabled: source.TRADING_ENABLED === "true", missing, errors: parsed.success ? [] : parsed.error.issues.map((issue) => issue.message) };
}
