import { isAbsolute } from "node:path";
export type ProcessResult = { stdout: string; stderr: string; exitCode: number };
export class RestrictedProcessRunner {
  constructor(private readonly executable: string, private readonly home: string, private readonly timeoutMs = 30_000, private readonly maxOutputBytes = 1_000_000) {
    if (!isAbsolute(executable) || !isAbsolute(home)) throw new Error("Circle executable and HOME must be absolute paths");
  }
  async run(args: readonly string[]): Promise<ProcessResult> {
    if (args.some((arg) => arg.includes("\0") || arg.length > 512)) throw new Error("Unsafe Circle argument");
    const child = Bun.spawn([this.executable, ...args], { env: { HOME: this.home, PATH: "/usr/local/bin:/usr/bin:/bin", LANG: "C.UTF-8" }, stdout: "pipe", stderr: "pipe" });
    const timer = setTimeout(() => child.kill(), this.timeoutMs);
    try {
      const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      if (stdout.length + stderr.length > this.maxOutputBytes) throw new Error("Circle output exceeded the configured limit");
      return { stdout, stderr: redact(stderr), exitCode };
    } finally { clearTimeout(timer); }
  }
}
function redact(value: string): string { return value.replace(/(token|secret|authorization|cookie)["'=:\s]+[^\s,"]+/gi, "$1=[REDACTED]"); }
