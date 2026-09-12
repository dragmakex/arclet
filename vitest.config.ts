import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  test: { environment: "node", coverage: { reporter: ["text", "json"] } },
  resolve: { alias: {
    "@arclet/domain": `${root}packages/domain/src/index.ts`,
    "@arclet/policy": `${root}packages/policy/src/index.ts`,
    "@arclet/graph": `${root}packages/graph/src/index.ts`,
    "@arclet/circle": `${root}packages/circle/src/index.ts`,
    "@arclet/chain": `${root}packages/chain/src/index.ts`,
    "@arclet/agent": `${root}packages/agent/src/index.ts`,
    "@arclet/db": `${root}packages/db/src/index.ts`
  }}
});
