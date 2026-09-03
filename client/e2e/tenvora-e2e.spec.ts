import { test, expect } from "@playwright/test";

test.describe("Tenvora Multi-Tenant PayOps E2E Journey", () => {
  test("loads landing page and presents architecture overview", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Tenvora/);
    await expect(page.getByRole("heading", { name: /Financial integrity/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Launch Operations Console/i })).toBeVisible();
  });
});
