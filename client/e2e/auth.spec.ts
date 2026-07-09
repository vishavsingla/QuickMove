import { test, expect } from "@playwright/test";

test.describe("authentication", () => {
  test("customer can log in and reach booking page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@quickmove.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/book/, { timeout: 15_000 });
    await expect(page.getByText("Plan your move")).toBeVisible();
  });

  test("admin can log in and see admin console", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@quickmove.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText("Admin console")).toBeVisible();
  });

  test("driver can log in and see dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ravi.driver@quickmove.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/driver/);
    await expect(page.getByText("Driver dashboard")).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@quickmove.dev");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/login/);
  });
});
