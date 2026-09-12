import { isAbsolute } from "node:path";
export type ProcessResult = { stdout: string; stderr: string; exitCode: number; timedOut: boolean; overflowed: boolean };

export class RestrictedProcessRunner {
  constructor(private readonly executable: string, private readonly home: string, private readonly timeoutMs = 30_000, private readonly maxOutputBytes = 1_000_000) {
    if (!isAbsolute(executable) || !isAbsolute(home)) throw new Error("Circle executable and HOME must be absolute paths");
  }
  async run(args: readonly string[]): Promise<ProcessResult> {
    if (args.some((arg) => arg.includes("\0") || arg.length > 512)) throw new Error("Unsafe Circle argument");
    const child = Bun.spawn([this.executable, ...args], { env: { HOME: this.home, PATH: "/usr/local/bin:/usr/bin:/bin", LANG: "C.UTF-8" }, stdout: "pipe", stderr: "pipe" });
    let timedOut = false, overflowed = false, bytes = 0;
    const stop = (reason: "timeout" | "overflow") => { if (reason === "timeout") timedOut = true; else overflowed = true; child.kill(); };
    const read = async (stream: ReadableStream<Uint8Array>) => {
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > this.maxOutputBytes) { stop("overflow"); break; }
        chunks.push(value);
      }
      const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0), joined = new Uint8Array(length);
      let offset = 0; for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
      return new TextDecoder().decode(joined);
    };
    const timer = setTimeout(() => stop("timeout"), this.timeoutMs);
    try {
      const [stdout, stderr, exitCode] = await Promise.all([read(child.stdout), read(child.stderr), child.exited]);
      return { stdout: redact(stdout), stderr: redact(stderr), exitCode, timedOut, overflowed };
    } finally { clearTimeout(timer); await child.exited; }
  }
}

export function redact(value: string): string {
  try {
    const redactObject = (input: unknown): unknown => {
      if (Array.isArray(input)) return input.map(redactObject);
      if (!input || typeof input !== "object") return input;
      return Object.fromEntries(Object.entries(input).map(([key, item]) => [/secret|authorization|access.?token|refresh.?token|cookie|session/i.test(key) ? [key, "[REDACTED]"] : [key, redactObject(item)]][0]!));
    };
    return JSON.stringify(redactObject(JSON.parse(value)));
  } catch {
    return value.replace(/(secret|authorization|access.?token|refresh.?token|cookie|session)["'=:\s]+[^\s,"]+/gi, "$1=[REDACTED]");
  }
}
