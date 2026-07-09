import { test, expect } from "@playwright/test";

test("landing page shows hero and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Move anything")).toBeVisible();
  await expect(page.getByRole("link", { name: /Book a move/i }).first()).toBeVisible();
});
