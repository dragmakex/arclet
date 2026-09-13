import { test, expect } from "@playwright/test";

test("opens the unconfigured financial desk without invented account data", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/wallet$/);
  await expect(page.getByRole("heading", { name: "Arclet", exact: true })).toBeVisible();
  await expect(page.getByText("Tell Arclet how to trade.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Chat with Arclet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assets over time" })).toBeVisible();
  await expect(page.getByText("No reconciled balance history yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
});

test("keeps the unconfigured desk usable at a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Arclet", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("textbox", { name: "Tell Arclet how to trade" })).toBeDisabled();
  await expect(page.getByText("No reconciled balance history yet.")).toBeVisible();
});
