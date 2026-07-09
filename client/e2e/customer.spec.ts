import { test, expect } from "@playwright/test";

test.describe("customer journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@quickmove.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/book/);
  });

  test("can view bookings list", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
  });

  test("can open profile and see saved addresses section", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saved addresses" })).toBeVisible();
  });
});
