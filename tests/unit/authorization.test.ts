import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { mandateDomain, mandateTypes, verifyMandateSignature, verifyWithdrawalSignature, withdrawalTypes } from "@arclet/domain";

const origin = "http://localhost:3000";
const owner = privateKeyToAccount(`0x${"1".repeat(64)}`);
const otherOwner = privateKeyToAccount(`0x${"2".repeat(64)}`);
const tradingWallet = "0x0000000000000000000000000000000000000001" as const;
const nonce = `0x${"3".repeat(64)}` as const;
const strategyHash = `0x${"4".repeat(64)}` as const;
const marketConfigHash = `0x${"5".repeat(64)}` as const;

const mandate = {
  owner: owner.address,
  tradingWallet,
  strategyId: `0x${"6".repeat(64)}` as const,
  strategyVersion: 1n,
  strategyHash,
  marketConfigHash,
  nonce,
  issuedAt: 1_700_000_000n,
  expiresAt: 1_700_000_300n
};

describe("signed authorization contracts", () => {
  it("accepts only the bound signer, chain, origin, and mandate fields", async () => {
    const signature = await owner.signTypedData({ domain: mandateDomain(5042002, origin), types: mandateTypes, primaryType: "MandateApproval", message: mandate });
    await expect(verifyMandateSignature({ approval: mandate, signature, chainId: 5042002, origin, expectedOwner: owner.address })).resolves.toBe(true);
    await expect(verifyMandateSignature({ approval: mandate, signature, chainId: 5042002, origin, expectedOwner: otherOwner.address })).resolves.toBe(false);
    await expect(verifyMandateSignature({ approval: mandate, signature, chainId: 5042002, origin: "http://evil.example", expectedOwner: owner.address })).resolves.toBe(false);
  });

  it("binds a withdrawal to the same verified owner and destination", async () => {
    const approval = {
      owner: owner.address,
      tradingWallet,
      destination: owner.address,
      assetId: "USDC" as const,
      amountAtomic: 1_000_000n,
      chainId: 5042002n,
      nonce,
      issuedAt: 1_700_000_000n,
      expiresAt: 1_700_000_300n
    };
    const signature = await owner.signTypedData({ domain: mandateDomain(5042002, origin), types: withdrawalTypes, primaryType: "WithdrawalApproval", message: approval });
    await expect(verifyWithdrawalSignature({ approval, signature, origin, expectedOwner: owner.address })).resolves.toBe(true);
    await expect(verifyWithdrawalSignature({ approval: { ...approval, destination: otherOwner.address }, signature, origin, expectedOwner: owner.address })).resolves.toBe(false);
  });
});
