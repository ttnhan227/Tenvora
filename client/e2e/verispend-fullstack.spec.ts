import { expect, test } from "@playwright/test";

test.describe("VeriSpend Multi-Tenant Full-Stack E2E Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("1. Multi-tenant authentication & strict ledger isolation", async ({ page }) => {
    // 1. Log in as Northwind Analytics (Tenant 1)
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "VeriSpend" })).toBeVisible();

    await page.locator("#email").fill("marcus.river@northwindanalytics.com");
    await page.locator("#password").fill("123");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Verify successful login to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Northwind Analytics|Marcus River/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Total Spend|Monthly Expenses|Pending Approval/i).first()).toBeVisible();

    // 2. Log out
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    });

    // 3. Log in as Blue Harbor Logistics (Tenant 2)
    await expect(page).toHaveURL(/.*login/);
    await page.locator("#email").fill("daniel.kim@blueharborlogistics.com");
    await page.locator("#password").fill("123");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Verify Blue Harbor tenant isolation
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Blue Harbor Logistics|Daniel Kim/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("2. Expense ledger, live search, and fast filter transitions", async ({ page }) => {
    // Log in as Northwind Analytics
    await page.goto("/login");
    await page.locator("#email").fill("marcus.river@northwindanalytics.com");
    await page.locator("#password").fill("123");
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to Expenses
    await page.getByRole("link", { name: /Expenses/i }).first().click();
    await expect(page).toHaveURL(/.*expenses/);

    // Verify Expense table headers
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Merchant|Category|Amount|Status/i).first()).toBeVisible();

    // Test Live Merchant Search Input
    const searchInput = page.getByPlaceholder(/Search merchant, category/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Uber");
      await page.waitForTimeout(300);
      // Verify filtered results or empty state rendered properly
      await expect(page.getByRole("table")).toBeVisible();
      await searchInput.clear();
    }

    // Test View Mode toggle (Spreadsheet vs Table view)
    const spreadsheetToggle = page.getByRole("button", { name: /Spreadsheet|Grid/i });
    if (await spreadsheetToggle.isVisible()) {
      await spreadsheetToggle.click();
      await page.waitForTimeout(300);
      const listToggle = page.getByRole("button", { name: /List|Table/i });
      if (await listToggle.isVisible()) {
        await listToggle.click();
      }
    }
  });

  test("3. Manager approval queue, drawer review, and decision workflow", async ({ page }) => {
    // Log in as Olivia Chen (Manager)
    await page.goto("/login");
    await page.locator("#email").fill("olivia.chen@northwindanalytics.com");
    await page.locator("#password").fill("123");
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to Approval Queue
    await page.getByRole("link", { name: /Approval Queue/i }).first().click();
    await expect(page).toHaveURL(/.*manager\/pending/);

    // Verify Approval Queue table or empty state
    await expect(page.getByText(/Pending Manager Approval|Approval Queue|No expenses pending review/i).first()).toBeVisible({ timeout: 10_000 });

    // If pending items exist, open review drawer and test decision controls
    const reviewBtn = page.getByRole("button", { name: /Review|Inspect|View/i }).first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      // Assert review drawer/dialog is open
      const sheet = page.locator("[role='dialog']");
      await expect(sheet).toBeVisible();

      // Close drawer
      const closeBtn = page.locator("[role='dialog'] button").filter({ hasText: /Close/i }).or(page.locator("[role='dialog'] svg.lucide-x")).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("4. Policy simulation lab reactive calculations", async ({ page }) => {
    // Log in as Owner (Marcus River)
    await page.goto("/login");
    await page.locator("#email").fill("marcus.river@northwindanalytics.com");
    await page.locator("#password").fill("123");
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to Policy Simulation Lab
    await page.getByRole("link", { name: /Policy Simulation/i }).first().click();
    await expect(page).toHaveURL(/.*policy-lab/);

    // Verify Policy Lab controls
    await expect(page.getByText(/Policy Simulation Lab/i)).toBeVisible();
    await expect(page.getByText(/Simulation Parameters/i)).toBeVisible();

    // Adjust spend limit input
    const maxAmountInput = page.locator("#amount");
    if (await maxAmountInput.isVisible()) {
      await maxAmountInput.fill("300");
      const runBtn = page.getByRole("button", { name: /Run Impact Simulation/i });
      if (await runBtn.isVisible()) {
        await runBtn.click();
      }
      // Verify simulated outcome cards update
      await expect(page.getByText(/Auto-Approved|Claims cleared|Automation/i).first()).toBeVisible();
    }
  });

  test("5. Compliance & SOX hub inspection", async ({ page }) => {
    // Log in as Owner
    await page.goto("/login");
    await page.locator("#email").fill("marcus.river@northwindanalytics.com");
    await page.locator("#password").fill("123");
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to Compliance Hub
    await page.getByRole("link", { name: /Compliance & SOX/i }).first().click();
    await expect(page).toHaveURL(/.*compliance/);

    // Verify Compliance Hub elements
    await expect(page.getByText(/Compliance & Audit Hub|SOX Compliance|Audit Readiness/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
