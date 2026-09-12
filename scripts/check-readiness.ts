import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { capabilityStatus } from "../config/runtime";

const config = capabilityStatus();
const required = ["README.md", "docs/architecture.svg", "docs/evidence/manifest.json", "SPEC.md", "AGENT.md", "PROMPT.md"];
const missingArtifacts = required.filter((path) => !existsSync(path));
const manifestSchema = z.object({ checks: z.array(z.object({ id: z.string(), status: z.enum(["PASS", "FAIL", "BLOCKED", "NOT_RUN"]) }).passthrough()) }).passthrough();
const manifest = manifestSchema.parse(JSON.parse(readFileSync("docs/evidence/manifest.json", "utf8")));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  environment: config.environment,
  configuration: config.configured ? "PASS" : "BLOCKED",
  buildArtifacts: missingArtifacts.length ? "FAIL" : "PASS",
  missingArtifacts,
  live: manifest.checks.map(({ id, status }) => ({ id, status }))
};
console.log(JSON.stringify(report, null, 2));
if (!config.configured || missingArtifacts.length || report.live.some((item) => item.status !== "PASS")) process.exitCode = 1;
