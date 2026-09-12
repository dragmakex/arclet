import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GraphClient } from "@arclet/graph";

describe("Graph client failure handling", () => {
  it("rejects an HTTP 200 GraphQL error rather than treating it as live data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { value: 1 }, errors: [{ message: "indexing failure" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new GraphClient("https://gateway.thegraph.com/api/subgraphs/id/test", "test").query("query X { x }", {}, z.object({ value: z.number() }))).rejects.toThrow("GraphQL error");
    vi.unstubAllGlobals();
  });
});
