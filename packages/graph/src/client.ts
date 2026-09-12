import { z } from "zod";

const envelopeSchema = z.object({ data: z.unknown().optional(), errors: z.array(z.object({ message: z.string() }).passthrough()).optional() }).passthrough();
export class GraphClient {
  constructor(private readonly endpoint: string, private readonly apiKey: string, private readonly timeoutMs = 10_000) {
    if (!endpoint.startsWith("https://gateway.thegraph.com/")) throw new Error("Graph endpoint must use the approved HTTPS gateway");
  }
  async query<T>(document: string, variables: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
    const response = await fetch(this.endpoint, { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ query: document, variables }), signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Graph HTTP ${response.status}`);
    const envelope = envelopeSchema.parse(await response.json());
    if (envelope.errors?.length) throw new Error(`GraphQL error: ${envelope.errors.map((error) => error.message).join("; ")}`);
    if (envelope.data === undefined) throw new Error("Graph response omitted data");
    return schema.parse(envelope.data);
  }
}
