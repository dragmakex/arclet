import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: { command: "bun run dev:web", url: "http://127.0.0.1:3000", reuseExistingServer: true }
});
