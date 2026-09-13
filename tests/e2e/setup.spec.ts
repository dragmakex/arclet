import { test, expect } from "@playwright/test";

test("opens the unconfigured financial desk without invented account data", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/wallet$/);
  await expect(page.getByText("ARC TESTNET / NO REAL MONETARY VALUE")).toBeVisible();
  await expect(page.getByRole("heading", { name: "THE MANDATE" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ask the desk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Decision tape" })).toBeVisible();
  await expect(page.getByText("No balance history yet.")).toBeVisible();
  await expect(page.getByText("No HOLD, quote, submission, receipt, failed, or unknown state has been recorded.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask Arclet" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Pause mandate" })).toBeDisabled();
});
