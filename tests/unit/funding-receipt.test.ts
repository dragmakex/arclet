import { describe, expect, it } from "vitest";
import { verifyTransactionSender } from "@arclet/chain";

describe("funding receipt sender binding", () => {
  it("rejects a matching token event when the transaction sender is not the verified personal wallet", () => {
    expect(() => verifyTransactionSender({ from: "0x0000000000000000000000000000000000000002" }, "0x0000000000000000000000000000000000000001")).toThrow(/sender/);
    expect(() => verifyTransactionSender({ from: "0x0000000000000000000000000000000000000001" }, "0x0000000000000000000000000000000000000001")).not.toThrow();
  });
});
